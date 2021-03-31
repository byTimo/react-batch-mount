export interface SchedulerConfig {
    /**
     * The max count of the components in a batch. If this field and budget field aren't specified - equal 1.
     * */
    maxBatchSize?: number;

    /**
     * The time in ms that the scheduler will aim for when mounting batches. The scheduler
     * counts the mount time of the previous batch and estimates how many components to mount
     * in the next one. If maxBatchSize is specified, the Math.min value is used.
     */
    budget?: number;

    /**
     * If true scheduler writes logs to the console during mount.
     */
    trace?: boolean;

    /**
     * Set delay between batch mount in milliseconds.
     */
    delay?: number;
}

export type ScheduleEvent = "start" | "end";

export type Resolver = () => void;

export interface SchedulerState {
    queue: Array<Resolver>;
    frameToken: number | null;
    scheduleTimestamp: number;
    lastMountedTimestamp: number;
    prevBatchSize: number;
    awaitingMountCount: number;
    config: SchedulerConfig;
    callbacks: Record<ScheduleEvent, Array<() => void>>;
}

export type RegisterMode = "append" | "prepend";

export type Register = (resolver: Resolver, mode: RegisterMode) => void;
export type Mounted = () => void;
export type AddEventListener = (event: ScheduleEvent, callback: () => void) => () => void;

export interface Scheduler {
    register: Register;
    mounted: Mounted;
    addEventListener: AddEventListener;
    state: SchedulerState;
}

export function createScheduler(config: SchedulerConfig = {}): Scheduler {
    const state: SchedulerState = {
        queue: [],
        frameToken: null,
        scheduleTimestamp: 0,
        lastMountedTimestamp: 0,
        prevBatchSize: 1,
        awaitingMountCount: 0,
        config,
        callbacks: {
            start: [],
            end: [],
        }
    };

    function renderNextBatch() {
        const prevTimestamp =
            (state.lastMountedTimestamp - state.scheduleTimestamp) /
            state.prevBatchSize;

        trace(config.trace, `Previous timestamp is ${prevTimestamp}`);

        const maxBatchSize = getBatchSize(config, prevTimestamp);
        trace(config.trace, `Next batch size is ${maxBatchSize}`);

        const batch = state.queue.splice(0, maxBatchSize);
        state.prevBatchSize = batch.length;
        state.awaitingMountCount = batch.length;

        state.scheduleTimestamp = Date.now();
        trace(config.trace, `Schedule timestamp is ${state.scheduleTimestamp}`);
        batch.forEach((resolve) => resolve());
    }

    function getBatchSize(config: SchedulerConfig, prevTimestamp: number) {
        const maxBatchSize = config.maxBatchSize != null && config.maxBatchSize > 0
            ? config.maxBatchSize
            : 1;

        if (config.budget != null && prevTimestamp > 0) {
            const size = Math.floor(config.budget / prevTimestamp);
            const batchSize = size > 0 ? size : 1;
            return config.maxBatchSize != null ? Math.min(batchSize, maxBatchSize) : batchSize;
        }

        return maxBatchSize;
    }

    function register(resolver: Resolver, mode: RegisterMode) {
        switch (mode) {
            case "append":
                state.queue.push(resolver);
                trace(config.trace, "resolver was appended");
                break;
            case "prepend":
                trace(config.trace, "resolver was prepended");
                state.queue.unshift(resolver);
                break;
            default:
                throw new Error(`Incorrect register mode: ${mode}`);
        }

        if (state.frameToken == null) {
            state.frameToken = requestAnimationFrame(renderNextBatch);
            trace(config.trace, `RAF ${state.frameToken} registered`);
            state.callbacks.start.forEach(c => c());
        }
    }

    function mounted() {
        state.awaitingMountCount--;
        trace(config.trace, `Component was mounted. Awaiting ${state.awaitingMountCount}`);
        if (state.awaitingMountCount <= 0) {
            if (state.queue.length === 0) {
                trace(config.trace, "Mount queue is empty");
                state.frameToken = null;
                state.callbacks.end.forEach(c => c());
                return;
            }
            state.lastMountedTimestamp = Date.now();
            trace(config.trace, `Last mount timestamp is ${state.lastMountedTimestamp}`);

            if (config.delay == null) {
                state.frameToken = requestAnimationFrame(renderNextBatch);
                trace(config.trace, `RAF ${state.frameToken} registered`);
            } else {
                state.frameToken = setTimeout(() => {
                    state.frameToken = requestAnimationFrame(renderNextBatch);
                    trace(config.trace, `RAF ${state.frameToken} registered`);
                }, config.delay) as any as number;
            }

        }
    }

    function addEventListener(event: ScheduleEvent, callback: () => void): () => void {
        state.callbacks[event].push(callback);
        return () => state.callbacks[event].filter(x => x !== callback);
    }

    return {register, mounted, state, addEventListener};
}

function trace(tracing: boolean | undefined, message: string): void {
    if (tracing) {
        console.log(message);
    }
}