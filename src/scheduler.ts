export type SchedulerConfig = { batchSize: number } | { budget: number };
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
            state.frameToken = null;
            return;
        }

        const prevTimestamp =
            (state.lastMountedTimestamp - state.scheduleTimestamp) /
            state.prevBatchSize;

        const maxBatchSize = getBatchSize(state.config, prevTimestamp);
        const batch = state.queue.splice(0, maxBatchSize);
        state.prevBatchSize = batch.length;
        state.awaitingMountCount = batch.length;

        batch.forEach((resolve) => resolve());
        state.scheduleTimestamp = Date.now();
    }

    function register(resolver: Resolver, mode: RegisterMode) {
        switch (mode) {
            case "append":
                state.queue.push(resolver);
                break;
            case "prepend":
                state.queue.unshift(resolver);
                break;
            default:
                throw new Error(`Incorrect register mode: ${mode}`);
        }

        if (state.frameToken == null) {
            state.frameToken = requestAnimationFrame(renderNextBatch);
        }
    }

    function mounted() {
        state.awaitingMountCount--;
        if (state.awaitingMountCount <= 0) {
            state.lastMountedTimestamp = Date.now();
            state.frameToken = requestAnimationFrame(renderNextBatch);
        }
    }

    return { register, mounted, state };
}

function getBatchSize(config: SchedulerConfig, prevTimestamp: number) {
    if ("batchSize" in config) {
        return config.batchSize;
    }

    if ("budget" in config && prevTimestamp > 0) {
        const size = Math.floor(config.budget / prevTimestamp);
        return size > 0 ? size : 1;
    }

    return 1;
}