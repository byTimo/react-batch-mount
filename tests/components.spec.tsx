import React from "react";
import {BatchMountScheduler} from "../src";

test("component type check", () => {
    <BatchMountScheduler budget={500}/>;
    <BatchMountScheduler maxBatchSize={1}/>;
    <BatchMountScheduler maxBatchSize={1} budget={50}/>;
    <BatchMountScheduler trace budget={50}/>;
    <BatchMountScheduler trace maxBatchSize={50}/>;
    <BatchMountScheduler delay={50}/>;

    expect(true);
})