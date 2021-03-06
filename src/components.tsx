import React from "react";
import {BatchMountContext} from './context';
import {createScheduler, RegisterMode, SchedulerConfig} from './scheduler';

export type BatchMountSchedulerProps = SchedulerConfig;

/**
 * Create a new scheduler and provider `BatchMountContext`. You can specify `batchSize` or `budget`.
 */
export const BatchMountScheduler: React.FC<BatchMountSchedulerProps> = props => {
    const scheduler = React.useMemo(() => createScheduler(props), [])
    React.useEffect(() => () => {
        cancelAnimationFrame(scheduler.state.frameToken!);
        clearTimeout(scheduler.state.frameToken!);
    }, []);

    return (
        <BatchMountContext.Provider value={scheduler}>
            {props.children}
        </BatchMountContext.Provider>
    )
}

function trackMount<TProps>(Component: React.ComponentType<TProps>): React.ComponentType<TProps> {
    return props => {
        const {mounted} = React.useContext(BatchMountContext);
        React.useEffect(() => {
            mounted();
        }, []);
        return <Component {...props} />
    }
}

export interface BatchMountOptions {
    /**
     * Don't add an effect to the Component with `mounted()` call after mounting.
     * You have to call `mounted()` manually.
     */
    noTrackMount?: true;

    /**
     * Wraps the Component into `React.Suspense` with the specified `fallback`, if passed.
     */
    fallback?: React.ReactNode;

    /**
     * Specify where to add the Component to the mount queue - at the beginning or at the end.
     */
    mode?: RegisterMode;
}

/**
 * The HOC wraps the component so that the component is mounted deferred in the batch.
 * @param {React.ComponentType} Component Wrapping react component
 * @param {BatchMountOptions} [options] Additional optional options
 */
export function batchMount<TProps>(Component: React.ComponentType<TProps>, options?: BatchMountOptions): React.ComponentType<TProps> {
    return props => {
        const {register} = React.useContext(BatchMountContext);

        const BatchedComponent = React.useMemo(() => {
            const mode = options?.mode || "append";
            const promise = new Promise<any>(resolve => {
                register(() => resolve({default: options?.noTrackMount ? Component : trackMount(Component)}), mode);
            });
            return React.lazy(() => promise);
        }, []);

        if (options?.fallback !== undefined) {
            return (
                <React.Suspense fallback={options.fallback}>
                    <BatchedComponent {...props} />
                </React.Suspense>
            );
        }

        return <BatchedComponent {...props} />;
    }
}

/**
 * Observes the state of the scheduler. Triggers a rerender if the state has changed.
 * Returns true if the scheduler has active tasks.
 */
export function useSchedulerObserve(): boolean {
    const [isActive, setIsActive] = React.useState(false);
    const {addEventListener} = React.useContext(BatchMountContext);

    React.useEffect(() => {
        const removeStartListener = addEventListener("start", () => setIsActive(true));
        const removeEndListener = addEventListener("end", () => setIsActive(false));
        return () => {
            removeStartListener();
            removeEndListener();
        };
    }, [addEventListener]);

    return isActive;
}

export interface SchedulerObserverProps {
    /**
     * The function of getting children based on the state of the scheduler.
     * @param isActive true if the scheduler has active tasks
     */
    children: (isActive: boolean) => React.ReactElement;
}

/**
 * The component that observes the state of the scheduler. Rerendered on state change.
 */
export const SchedulerObserver: React.FC<SchedulerObserverProps> = props => {
    const isActive = useSchedulerObserve();
    return React.useMemo(() => props.children(isActive), [isActive]);
}