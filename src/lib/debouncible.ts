import type { Readable, Subscriber, Unsubscriber, Writable } from "./types";

export function debouncible<T>(
    store: Readable<T> | Writable<T>,
    run: Subscriber,
    count = 1,
): Unsubscriber {
    let called = 0;
    return store.subscribe((value) => {
        if (called < count) return called++;
        run(value);
    });
}
