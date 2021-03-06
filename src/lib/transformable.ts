import type {
    Assertor,
    Invalidator,
    IOReadable,
    IOStatus,
    StartStopNotifier,
    State,
    SubscribeInvalidateTuple,
    Subscriber,
    Updater,
    ValuedError,
    Writable,
} from "./types";
import { has, identity, noop, valid } from "./utils";
import { set, subscribe } from "./store";
import { dequal } from "dequal/lite";

export interface TransformableOptions<T> {
    /**
     * Guard root writable from invalid values
     */
    assert?: Assertor<T>;
    /**
     * Compare old and new writable value to determine whether to update
     * @param a the previous value
     * @param b the new value
     */
    equal?: (a: T, b: T) => boolean;

    name: string;

    /**
     * Start and stop notification callbacks for subscriptions
     */
    start?: StartStopNotifier<T>;

    transforms?: Record<string, {
        /**
         * Guard transformed writable from invalid values
         */
        assert?: Assertor<unknown>;

        /**
         * Transform from root value to transformed value
         * @param value root value
         */
        from: (value: T) => unknown;

        /**
         * Transform transformed value to root value
         * @param value transformed value
         */
        to: (value: unknown) => T;
    }>
}

interface Obj {
    [key: string]: unknown;
}
type AddSuffix<Key, Suffix extends string> = Key extends string
    ? `${Key}${Suffix}`
    : never
type RemoveSuffix<SuffixedKey, Suffix extends string>
    = SuffixedKey extends AddSuffix<infer Key, Suffix> ? Key : "";

type TransformResult<O extends Obj, K extends string, I> = {
    [P in K]: Writable<I>
} &{
    [P in `${K}AssertStatus`]: IOReadable<I>
} & {
    [P in keyof O]: Writable<O[P]>
} & {
    [P in AddSuffix<keyof O, "AssertStatus"> ]: IOReadable<O[RemoveSuffix<P, "AssertStatus">]>
}

export function transformable<I, K extends string, O extends Obj>(
    options: {
        assert?: Assertor<I>,
        equal?: (a: I, b: I) => boolean,
        name: K,
        start?: StartStopNotifier<I>,
        transforms?: {
            [P in keyof O]: {
                assert?: Assertor<O[P]>,
                from: (val: I) => O[P],
                to: (val: O[P]) => I
            }
        } & {
            [P in K]?: never;
        }
    },
    value?: I,
) : { [P in keyof TransformResult<O, K, I>]: TransformResult<O, K, I>[P] }

/**
 * Create a `Transformable` store that allows both updating and reading by subscription.
 * @param {Options} options transformable options
 * @param {*} value initial value
 */
export function transformable<T>(
    options: TransformableOptions<T>,
    value?: T,
): Obj {
    const {
        equal = dequal,
        name,
        start = noop,
        transforms = {},
        assert = valid,
    } = options;

    let ready = false;
    let v = value;
    const reset = () => v = value;
    const state: State<unknown> = {
        equal,
        stop: null,
        subscribers: new Set<SubscribeInvalidateTuple<unknown>>(),
        start,
        get value() {
            return v;
        },
        set value(value) {
            v = value;
        },
        get ready() {
            return ready;
        },
        set ready(value) {
            ready = value;
        },
    };

    const stores: Obj = {};

    append_store({
        from: identity,
        to: identity,
        assert,
        transform: name,
    });

    function append_store(options) {
        const { from, to, transform, assert } = options;

        let status: IOStatus = "done";
        const validation_scope: State<IOStatus> = {
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

        const validation_readable: IOReadable<unknown> = {
            subscribe: subscribe.bind(undefined, validation_scope),
            get: () => status,
            reset: () => {
                status = "done";
                validation_readable.error = null;
            },
            error: null,
        };

        return Object.assign(stores, {
            [transform]: {
                get: () => from(v),
                set: (new_value) => {
                    let error: ValuedError<unknown> = null;
                    let status: IOStatus = "done";
                    try {
                        if (assert(new_value) === true) {
                            set(state, to(new_value));
                        }
                    } catch (caught) {
                        error = Object.assign(caught, { value: new_value });
                        status = "error";
                    }
                    validation_readable.error = error;
                    set<IOStatus>(validation_scope, status);
                },
                subscribe: (run: Subscriber, invalidate: Invalidator) => (
                    subscribe(state, (value) => run(from(value)), invalidate)
                ),
                update(fn: Updater) {
                    this.set(fn(from(v)));
                },
                reset,
            },
            [`${transform}AssertStatus`]: validation_readable,
        });
    }

    for (const transform in transforms) {
        if (has(transforms, transform)) {
            const { from, to, assert = valid } = transforms[transform];
            append_store({ from, to, transform, assert });
        }
    }

    return stores;
}
