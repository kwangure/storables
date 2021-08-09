import { has, identity, noop, valid } from "./utils";
import type {
    Invalidator,
    IOReadable,
    IOStatus,
    StartStopNotifier,
    State,
    SubscribeInvalidateTuple,
    Subscriber,
    Updater,
    Validator,
    Writable,
} from "./types";
import { set, subscribe } from "./store";
import { dequal } from "dequal/lite";

export interface TransformableOptions<T> {
    name: string;
    transforms?: Record<string, {
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

        /**
         * Guard transformed writable from invalid values
         * @param value transformed value
         */
        validate?: Validator<unknown>;
    }>

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
    validate?: Validator<T>;
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
    [P in `${K}ValidationStatus`]: IOReadable<I>
} & {
    [P in keyof O]: Writable<O[P]>
} & {
    [P in AddSuffix<keyof O, "ValidationStatus"> ]: IOReadable<O[RemoveSuffix<P, "ValidationStatus">]>
}

export function transformable<I, K extends string, O extends Obj>(
    options: {
        name: K,
        transforms?: {
            [P in keyof O]: {
                from: (val: I) => O[P],
                to: (val: O[P]) => I
                validate?: Validator<O[P]>
            }
        } & {
            [P in K]?: never;
        },
        equal?: (a: I, b: I) => boolean,
        start?: StartStopNotifier<I>,
        validate?: Validator<I>,
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
        validate = valid,
    } = options;

    const state = {
        equal,
        stop: null,
        subscribers: new Set<SubscribeInvalidateTuple<unknown>>(),
    };
    let ready = false;
    let v = value;
    const reset = () => v = value;

    const stores: Obj = {};

    append_store({
        from: identity,
        start,
        to: identity,
        validate,
        transform: name,
    });

    function append_store(options) {
        const { from, start, to, transform, validate } = options;

        const transform_state: State<unknown> = Object.assign({
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
        }, state);

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
                    const validate_result = validate(new_value);
                    if (validate_result instanceof Error) {
                        validation_readable.error = Object.assign(
                            validate_result,
                            { value: new_value },
                        );
                        set<IOStatus>(validation_scope, "error");
                    } else {
                        validation_readable.error = null;
                        set<IOStatus>(validation_scope, "done");
                        if (validate_result === true) {
                            set(transform_state, to(new_value));
                        }
                    }
                },
                subscribe: (run: Subscriber, invalidate: Invalidator) => (
                    subscribe(
                        transform_state,
                        (value) => run(from(value)),
                        invalidate,
                    )
                ),
                update(fn: Updater) {
                    this.set(fn(from(v)));
                },
                reset,
            },
            [`${transform}ValidationStatus`]: validation_readable,
        });
    }

    for (const transform in transforms) {
        if (has(transforms, transform)) {
            const { from, to, validate = valid } = transforms[transform];
            append_store({ from, to, transform, validate });
        }
    }

    return stores;
}
