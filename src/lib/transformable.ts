import { error_equal, set, subscribe } from "./store";
import type {
    ErrorSubscriber,
    Invalidator,
    Readable,
    StartStopNotifier,
    State,
    SubscribeInvalidateTuple,
    Subscriber,
    Updater,
    Validator,
    Writable,
} from "./types";
import { has, identity, noop, safe_equal, valid } from "./utils";

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
type AddProp<T extends Obj, K extends string, V> = Record<K, V> & T;
type AddSuffix<Key, Suffix extends string> = Key extends string
    ? `${Key}${Suffix}`
    : never
type RemoveSuffix<SuffixedKey, Suffix extends string>
    = SuffixedKey extends AddSuffix<infer Key, Suffix> ? Key : "";

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
) : {
        [P in keyof AddProp<O, K, I>]: Writable<AddProp<O, K, I>[P]>
    } & {
        [P in AddSuffix<keyof AddProp<O, K, I>, "Error"> ]: Readable<AddProp<O, K, I>[RemoveSuffix<P, "Error">]>
    }

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
        equal = safe_equal,
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
            error: {
                equal: error_equal,
                ready: false,
                value: null,
                subscribers: new Set<ErrorSubscriber<unknown>>(),
            },
        }, state);

        return Object.assign(stores, {
            [transform]: {
                get: () => transform_state.value,
                set: (new_value) => {
                    const validate_result = validate(new_value);
                    const error = validate_result instanceof Error
                        ? Object.assign(validate_result, { value: new_value })
                        : null;
                    set(transform_state.error, error);
                    if (validate_result === true) {
                        set(transform_state, to(new_value));
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
                    this.set(fn(transform_state.value));
                },
                reset,
                state: transform_state,
            },
            [`${transform}Error`]: {
                subscribe: subscribe.bind(null, transform_state.error),
                get: () => transform_state.error.value,
                reset: () => transform_state.error.value = null,
            },
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
