import {createContext} from "react";
import {createScheduler, Scheduler, SchedulerConfig} from './scheduler';

export type BatchMountContextValue = Scheduler;

const scheduler = createScheduler({maxBatchSize: 1});

export function setGlobalConfig(config: SchedulerConfig) {
    scheduler.state.config = config;
}

export const addGlobalEventListener = scheduler.addEventListener;

export const BatchMountContext = createContext<BatchMountContextValue>(scheduler);