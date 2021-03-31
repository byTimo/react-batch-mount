import React from "react";
import {BatchMountScheduler} from "../lib";

test("component type check", () => {
    let s1 = <BatchMountScheduler budget={500}/>;
    let s2 = <BatchMountScheduler batchSize={1}/>;
    let s4 = <BatchMountScheduler trace budget={50}/>;
    let s5 = <BatchMountScheduler trace batchSize={50}/>;

    expect(true);
})