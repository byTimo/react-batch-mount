import React from "react";
import { BatchMountContext } from './context';
import { SchedulerConfig, createScheduler, RegisterMode } from './scheduler';

export type BatchMountSchedulerProps = SchedulerConfig;

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
    noTrackMount?: true;
    fallback?: React.ReactNode;
    mode?: RegisterMode;
}

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