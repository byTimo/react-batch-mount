import React from "react";
import { BatchMountContext } from './context';
import { SchedulerConfig, createScheduler, RegisterMode } from './scheduler';

export type BatchMountSchedulerProps = SchedulerConfig;

/**
 * Create a new scheduler and provider `BatchMountContext`. You can specify `batchSize` or `budget`.
 */
export const BatchMountScheduler: React.FC<BatchMountSchedulerProps> = props => {
    const scheduler = React.useMemo(() => createScheduler(props), [])
    React.useEffect(() => () => cancelAnimationFrame(scheduler.state.frameToken!), []);

    return (
        <BatchMountContext.Provider value={scheduler}>
            {props.children}
        </BatchMountContext.Provider>
    )
}

function trackMount<TProps>(Component: React.ComponentType<TProps>): React.ComponentType<TProps> {
    return props => {
        const { mounted } = React.useContext(BatchMountContext);
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
        const { register } = React.useContext(BatchMountContext);

        const BatchedComponent = React.useMemo(() => {
            const mode = options?.mode || "append";
            const promise = new Promise<any>(resolve => {
                register(() => resolve({ default: options?.noTrackMount ? Component : trackMount(Component) }), mode);
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