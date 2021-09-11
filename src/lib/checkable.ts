import type {
    Checker,
    IOReadable,
    IOStatus,
    StartStopNotifier,
    State,
    SubscribeInvalidateTuple,
    Updater,
    ValuedError,
    Writable,
} from "./types";
import { noop, valid } from "./utils";
import { set, subscribe } from "./store";
import { dequal } from "dequal/lite";

export interface CheckableOptions<T> {
    /** Guard root writable from invalid values */
    check?: Checker<T>;

    /** Compare old and new writable value to determine whether to update */
    equal?: (a: T, b: T) => boolean;

    name: string;

    /** Start and stop notification callbacks for subscriptions */
    start?: StartStopNotifier<T>;
}

interface Obj {
    [key: string]: unknown;
}

export function checkable<I, K extends string>(
    options: {
        check?: Checker<I>,
        equal?: (a: I, b: I) => boolean,
        name: K,
        start?: StartStopNotifier<I>
    },
    value?: I,
) : {
        [P in K]: Writable<I>;
    } & {
        [P in `${K}CheckStatus` ]: IOReadable<I>;
    }

/**
 * Create a `Checkable` store that allows both updating and reading by subscription.
 * @param {Options} options checkable options
 * @param {*} value initial value
 */
export function checkable<T>(
    options: CheckableOptions<T>,
    value?: T,
): Obj {
    const { equal = dequal, name, start = noop, check = valid } = options;

    let v = value;
    const reset = () => v = value;
    const scope: State<T> = {
        equal,
        start,
        get value() {
            return v;
        },
        set value(value) {
            v = value;
        },
        ready: false,
        subscribers: new Set<SubscribeInvalidateTuple<T>>(),
    };

    let status: IOStatus = "done";
    const check_status: State<IOStatus> = {
        equal: dequal,
        ready: false,
        subscribers: new Set<SubscribeInvalidateTuple<IOStatus>>(),
        get value() {
            return status;
        },
        set value(value) {
            status = value;
        },
    };

    const check_readable: IOReadable<T> = {
        subscribe: subscribe.bind(null, check_status),
        get: () => status,
        reset: () => {
            status = "done";
            check_readable.error = null;
        },
        error: null,
    };

    const writable = {
        get: (): T => v,
        async set(new_value: T) {
            set<T>(scope, new_value);

            check_readable.error = null;
            set<IOStatus>(check_status, "pending");

            let error: ValuedError<T> = null;
            let status: IOStatus = "done";
            try {
                await check(new_value);
            } catch (caught) {
                error = Object.assign(caught, { value: new_value });
                status = "error";
            }
            // `writable.set` was called while we were running validation
            // TODO-1: Add failing test for what happens when you remove this check
            // TODO-2: Use blank object (`{}`) as unique key for each `set` call and
            // compare those instead, since `equal` might be expensive.
            if (!equal(v, new_value)) return;

            check_readable.error = error;
            set<IOStatus>(check_status, status);
        },
        subscribe: subscribe.bind(null, scope),
        update(fn: Updater) {
            this.set(fn(v));
        },
        reset,
    };

    return {
        [name]: writable,
        [`${name}CheckStatus`]: check_readable,
    };
}
