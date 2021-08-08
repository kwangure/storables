import type {
    Invalidator,
    State,
    SubscribeInvalidateTuple,
    Subscriber,
    Unsubscriber,
} from "./types";
import { noop } from "./utils";

const subscriber_queue = [];

export function call_subscribers<T>(scope: State<T>): void {
    const { subscribers, value, ready } = scope;

    if (!ready) return;

    const run_queue = !subscriber_queue.length;
    for (const subscriber of subscribers) {
        subscriber[1]();
        subscriber_queue.push(subscriber, value);
    }
    if (run_queue) {
        for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
        }
        subscriber_queue.length = 0;
    }
}

export function error_equal<T>(a: T, b: T): boolean {
    return a === null && b === null;
}

export function set<T>(scope: State<T>, new_value: T): void {
    if (!scope.equal(scope.value, new_value)) {
        scope.value = new_value;
        call_subscribers(scope);
    }
}

export function subscribe<T>(
    scope: State<T>,
    run: Subscriber<T>,
    invalidate: Invalidator<T> = noop,
): Unsubscriber {
    const subscriber: SubscribeInvalidateTuple<T> = [run, invalidate];
    scope.subscribers.add(subscriber);
    if (scope.subscribers.size === 1) {
        scope.ready = true;
        if (scope.start) {
            scope.stop = scope.start(set.bind(null, scope)) || noop;
        }
    }
    run(scope.value);
    return () => {
        scope.subscribers.delete(subscriber);
        if (scope.subscribers.size === 0) {
            scope.ready = false;
            if (scope.stop) {
                scope.stop();
                scope.stop = null;
            }
        }
    };
}

export function subscribe_lite<T>(
    scope: State<T>,
    run: Subscriber<T>,
    invalidate: Invalidator<T> = noop,
): Unsubscriber {
    const subscriber: SubscribeInvalidateTuple<T> = [run, invalidate];
    scope.subscribers.add(subscriber);
    scope.ready = true;
    run(scope.value);
    return () => {
        scope.subscribers.delete(subscriber);
    };
}
