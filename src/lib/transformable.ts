import { identity, noop, safe_not_equal, valid } from "./utils";
import type {
    Invalidator,
    Readable,
    StartStopNotifier,
    SubscribeInvalidateTuple,
    Subscriber,
    Unsubscriber,
    Updater,
    Writable,
} from "./types";

/** Transform to transformable root value */
interface Transformer<T1, T2> {
    name: string;
    fn: (value: T1) => T2;
}

interface TransformError<T> extends Error {
    transform: string;
    value: T;
}

/** Guard writable from invalid values */
type Validator<T> = (value?: T) => (boolean | Error);

export interface Options<T> {
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
     * Start and stop notification callbacks for subscriptions
     */
    start?: StartStopNotifier<T>;

    /**
     * Guard root writable from invalid values
     * @param value root value
     */
    validate?: Validator<T>;
}

const subscriber_queue = [];

interface Obj {
    [key: string]: unknown;
}
type AddProp<T extends Obj, K extends string, V> = Record<K, V> & T;
type AddSuffix<Key, Suffix extends string> = Key extends string
    ? `${Key}${Suffix}`
    : never
type RemoveSuffix<SuffixedKey, Suffix extends string>
    = SuffixedKey extends AddSuffix<infer Key, Suffix> ? Key : "";

export function transformable<K extends string, I, O extends Obj>(
    options: {
        name: K,
        transforms?: {
            [P in keyof O]: {
                from: (val: I) => O[P],
                to: (val: O[P]) => I
                validate?: Validator<O[P]>
            }
        },
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
export function transformable<T>(options: Options<T>, value?: T): Obj {
    const { name, transforms = {}, start = noop, validate = valid } = options;

    if (name in transforms) {
        throw Error(`Transformable name '${name}' should not be included in transforms.`);
    }

    function call_subscribers<T>(
        subscribers: Set<SubscribeInvalidateTuple<T>>,
        value: T | TransformError<T>,
    ) {
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

    let stop: Unsubscriber;
    const subscribers: Set<SubscribeInvalidateTuple<T>> = new Set();
    function set(new_value: T): void {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                call_subscribers(subscribers, value);
            }
        }
    }

    function subscribe(
        run: Subscriber<T>,
        invalidate: Invalidator<T>,
    ): Unsubscriber {
        const subscriber: SubscribeInvalidateTuple<T> = [run, invalidate];
        subscribers.add(subscriber);
        if (subscribers.size === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            subscribers.delete(subscriber);
            if (subscribers.size === 0) {
                stop();
                stop = null;
            }
        };
    }

    type SubscriberMap = Map<string, Set<SubscribeInvalidateTuple<unknown>>>;
    type ErrorMap<T> = Map<string, TransformError<T>>
    const errors: ErrorMap<unknown> = new Map();
    const error_subscribers: SubscriberMap = new Map();
    function subscribe_error(
        transform: string,
        run: Subscriber<unknown>,
        invalidate: Invalidator<unknown>,
    ): Unsubscriber {
        const subscriber: SubscribeInvalidateTuple<unknown> = [run, invalidate];

        if (error_subscribers.has(transform)) {
            error_subscribers.get(transform).add(subscriber);
        } else {
            error_subscribers.set(transform, new Set([subscriber]));
        }

        run(undefined);

        return () => {
            error_subscribers.get(transform).delete(subscriber);
        };
    }

    function set_if_valid<K>(
        new_value: K,
        validate: Validator<K>,
        transform: Transformer<K, T>,
    ) {
        const { name, fn } = transform;
        const valid = validate(new_value);

        if (valid instanceof Error) {
            const error = Object.assign(valid, {
                transform: name,
                value: new_value,
            });
            errors.set(name, error);
            call_subscribers(error_subscribers.get(name), error);
            return;
        }

        if (valid) {
            errors.delete(name);
            set(fn(new_value));
        }
    }

    Object.assign(transforms, {
        [name]: { to: identity, from: identity, validate },
    });

    const stores: Obj = {};

    /* eslint-disable no-loop-func */
    for (const transform in transforms) {
        if (Object.hasOwnProperty.call(transforms, transform)) {
            const { to, from, validate = valid } = transforms[transform];

            stores[transform] = {
                get() {
                    return from(value);
                },
                set(new_value: unknown) {
                    set_if_valid(new_value, validate, {
                        name: transform,
                        fn: to,
                    });
                },
                update(fn: Updater<unknown>) {
                    set_if_valid(fn(from(value)), validate, {
                        name: transform,
                        fn: to,
                    });
                },
                subscribe(
                    fn: Subscriber<unknown>,
                    invalidate: Invalidator<T> = noop,
                ) {
                    return subscribe((value) => fn(from(value)), invalidate);
                },
            };

            stores[`${transform}Error`] = {
                subscribe(
                    fn: Subscriber<unknown>,
                    invalidate: Invalidator<T> = noop,
                ) {
                    return subscribe_error(transform, fn, invalidate);
                },
                get() {
                    return errors.get(transform);
                },
            };
        }
        /* eslint-enable no-loop-func */
    }

    return stores;
}
