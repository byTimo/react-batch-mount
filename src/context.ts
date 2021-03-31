import {createContext} from "react";
import {createScheduler, Mounted, Register, SchedulerConfig} from './scheduler';

export interface BatchMountContextValue {
    register: Register;
    mounted: Mounted;
}

const {register, mounted, state} = createScheduler({batchSize: 1});

export function setGlobalConfig(config: SchedulerConfig) {
    state.config = config;
}

export const BatchMountContext = createContext<BatchMountContextValue>({register, mounted});