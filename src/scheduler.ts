export interface SchedulerConfig {
    /**
     * The max count of the components in a batch. The scheduler fills the batch completely
     * if there are enough components in the mount queue.
     */
    batchSize?: number;

    /**
     * The time in ms that the scheduler will aim for when mounting batches. The scheduler
     * counts the mount time of the previous batch and estimates how many components to mount
     * in the next one.
     */
    budget?: number;

    trace?: boolean;
}

export type Resolver = () => void;

export interface SchedulerState {
    queue: Array<Resolver>;
    frameToken: number | null;
    scheduleTimestamp: number;
    lastMountedTimestamp: number;
    prevBatchSize: number;
    awaitingMountCount: number;
    config: SchedulerConfig;
}

export type RegisterMode = "append" | "prepend";

export type Register = (resolver: Resolver, mode: RegisterMode) => void;
export type Mounted = () => void;

export interface Scheduler {
    register: Register;
    mounted: Mounted;
    state: SchedulerState;
}

export function createScheduler(config: SchedulerConfig): Scheduler {
    const state: SchedulerState = {
        queue: [],
        frameToken: null,
        scheduleTimestamp: 0,
        lastMountedTimestamp: 0,
        prevBatchSize: 1,
        awaitingMountCount: 0,
        config,
    };

    function renderNextBatch() {
        if (state.queue.length === 0) {
            trace(config.trace, "Mount queue is empty");
            state.frameToken = null;
            return;
        }

        const prevTimestamp =
            (state.lastMountedTimestamp - state.scheduleTimestamp) /
            state.prevBatchSize;

        trace(config.trace, `Previous timestamp is ${prevTimestamp}`);

        const maxBatchSize = getBatchSize(config, prevTimestamp);
        trace(config.trace, `Next batch size is ${maxBatchSize}`);

        const batch = state.queue.splice(0, maxBatchSize);
        state.prevBatchSize = batch.length;
        state.awaitingMountCount = batch.length;

        batch.forEach((resolve) => resolve());
        state.scheduleTimestamp = Date.now();
        trace(config.trace, `Schedule timestamp is ${state.scheduleTimestamp}`);
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
        }
    }

    function mounted() {
        state.awaitingMountCount--;
        trace(config.trace, `Component was mounted. Awaiting ${state.awaitingMountCount}`);
        if (state.awaitingMountCount <= 0) {
            state.lastMountedTimestamp = Date.now();
            trace(config.trace, `Last mount timestamp is ${state.lastMountedTimestamp}`);
            state.frameToken = requestAnimationFrame(renderNextBatch);
            trace(config.trace, `RAF ${state.frameToken} registered`);
        }
    }

    return {register, mounted, state};
}

function getBatchSize(config: SchedulerConfig, prevTimestamp: number) {
    if (config.batchSize != null) {
        return config.batchSize;
    }

    if (config.budget != null && prevTimestamp > 0) {
        const size = Math.floor(config.budget / prevTimestamp);
        return size > 0 ? size : 1;
    }

    return 1;
}

function trace(tracing: boolean | undefined, message: string): void {
    if (tracing) {
        console.log(message);
    }
}