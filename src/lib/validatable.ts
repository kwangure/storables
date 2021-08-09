import type {
    AsyncValidator,
    IOReadable,
    IOStatus,
    StartStopNotifier,
    State,
    SubscribeInvalidateTuple,
    Updater,
    Validator,
    Writable,
} from "./types";
import { noop, valid } from "./utils";
import { set, subscribe } from "./store";
import { dequal } from "dequal/lite";

export interface ValidatableOptions<T> {
    name: string;

    /**
     * Compare old and new writable value to determine whether to update
     */
    equal?: (a: T, b: T) => boolean;

    /**
     * Start and stop notification callbacks for subscriptions
     */
    start?: StartStopNotifier<T>;

    /**
     * Guard root writable from invalid values
     * @param value root value
     */
    validate?: AsyncValidator<T>;
}

interface Obj {
    [key: string]: unknown;
}

export function validatable<I, K extends string>(
    options: {
        name: K,
        equal?: (a: I, b: I) => boolean,
        start?: StartStopNotifier<I>,
        validate?: Validator<I>,
    },
    value?: I,
) : {
        [P in K]: Writable<I>;
    } & {
        [P in `${K}ValidationStatus` ]: IOReadable<I>;
    }

/**
 * Create a `Validatable` store that allows both updating and reading by subscription.
 * @param {Options} options validatable options
 * @param {*} value initial value
 */
export function validatable<T>(
    options: ValidatableOptions<T>,
    value?: T,
): Obj {
    const { equal = dequal, name, start = noop, validate = valid } = options;

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
    const validation_status: State<IOStatus> = {
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

    const validation_readable: IOReadable<T> = {
        subscribe: subscribe.bind(null, validation_status),
        get: () => status,
        reset: () => {
            status = "done";
            validation_readable.error = null;
        },
        error: null,
    };

    const writable = {
        get: (): T => v,
        async set(new_value: T) {
            set<T>(scope, new_value);

            validation_readable.error = null;
            set<IOStatus>(validation_status, "pending");
            const validate_result = await validate(new_value);
            // `writable.set` was called while we were running validation
            if (!equal(v, new_value)) return;

            if (validate_result instanceof Error) {
                validation_readable.error = Object.assign(validate_result, {
                    value: new_value,
                });
                set<IOStatus>(validation_status, "error");
            } else {
                validation_readable.error = null;
                set<IOStatus>(validation_status, "done");
            }
        },
        subscribe: subscribe.bind(null, scope),
        update(fn: Updater) {
            this.set(fn(v));
        },
        reset,
    };

    return {
        [name]: writable,
        [`${name}ValidationStatus`]: validation_readable,
    };
}
