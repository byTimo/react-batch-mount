import {createScheduler} from "../src";

jest.useRealTimers();

function mockRequestAnimationFrame(callback: (cb: (arg: number) => void, num: number) => void) {
    let num = 0;
    global.requestAnimationFrame = jest.fn(cb => {
        setTimeout(() => {
            callback(cb, num);
            num++;
        }, 0)
        return 0;
    });
}

function mockDateNow(now: number): void {
    Date.now = jest.fn(() => now);
}

beforeEach(() => {
    mockRequestAnimationFrame(cb => cb(0));
    mockDateNow(0);
});

test("resolve registered callback", done => {
    const scheduler = createScheduler({
        maxBatchSize: 1
    });
    const callback = jest.fn();
    mockRequestAnimationFrame(cb => {
        cb(0);
        expect(callback).toHaveBeenCalledTimes(1);
        done();
    })

    scheduler.register(callback, "append");
});

test("resolve registered callback in same different batch when batch size is 2", done => {
    const scheduler = createScheduler({
        maxBatchSize: 2,
    });
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    mockRequestAnimationFrame(cb => {
        cb(0);
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledTimes(1);
        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
        done();
    })

    scheduler.register(callback1, "append");
    scheduler.register(callback2, "append");
});

test("resolve only first callback in first batch when mounted function wasn't called", done => {
    const scheduler = createScheduler({
        maxBatchSize: 1,
    });
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    mockRequestAnimationFrame(cb => {
        cb(0);
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).not.toHaveBeenCalled();
        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
        done();
    })

    scheduler.register(callback1, "append");
    scheduler.register(callback2, "append");
});

test("resolve all callbacks in all batch when mounted function was called", done => {
    const scheduler = createScheduler({
        maxBatchSize: 1
    });
    const callback1 = jest.fn(scheduler.mounted);
    const callback2 = jest.fn(scheduler.mounted);

    mockRequestAnimationFrame((cb, num) => {
        cb(0);
        if(num > 0) {
            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
            expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
            done();
        }
    })

    scheduler.register(callback1, "append");
    scheduler.register(callback2, "append");
});

test("calculate batch size by budget", done => {
    const scheduler = createScheduler({
        budget: 10,
    });

    const callback1 = jest.fn(() => {
        mockDateNow(15);
        scheduler.mounted();
    });
    const callback2 = jest.fn(() => {
        mockDateNow(16);
        scheduler.mounted();
    });
    const callback3 = jest.fn(() => {
        mockDateNow(17);
        scheduler.mounted();
    });
    const callback4 = jest.fn(() => {
        mockDateNow(30);
        scheduler.mounted();
    });

    mockRequestAnimationFrame((cb, num) => {
        cb(0);
        if(num === 2) {
            expect(requestAnimationFrame).toHaveBeenCalledTimes(3);
            done();
        }
    })

    scheduler.register(callback1, "append");
    scheduler.register(callback2, "append");
    scheduler.register(callback3, "append");
    scheduler.register(callback4, "append");
})

test("ignore budget when first batch mount", done => {
    const scheduler = createScheduler({
        budget: 1,
        maxBatchSize: 2
    });
    const callback1 = jest.fn(() => {
        mockDateNow(5);
        scheduler.mounted();
    });
    const callback2 = jest.fn(() => {
        mockDateNow(10);
        scheduler.mounted();
    });
    const callback3 = jest.fn(() => {
        mockDateNow(15);
        scheduler.mounted();
    });
    const callback4 = jest.fn(() => {
        mockDateNow(20);
        scheduler.mounted();
    });

    mockRequestAnimationFrame((cb, num) => {
        cb(0);
        if(num === 2) {
            expect(requestAnimationFrame).toHaveBeenCalledTimes(3);
            done();
        }
    })

    scheduler.register(callback1, "append");
    scheduler.register(callback2, "append");
    scheduler.register(callback3, "append");
    scheduler.register(callback4, "append");
});

