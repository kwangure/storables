import type { Invalidator, Readable, StartStopNotifier, SubscribeInvalidateTuple, Subscriber, Unsubscriber, Writable } from "./types";
import { dequal } from "dequal/lite";
import { noop } from "./utils";

interface Obj {
    [key: string]: unknown;
}

export type IOStatus = "pending" | "done" | "error";

export interface IO<T> {
    /**
     * Read value from persistent storage
     */
    read(): Promise<T> | T | never;

    /**
     * Update writable when persistent storage changes.
     */
    update?: (set: Subscriber<T>) => Unsubscriber | void;

    /**
     * Write value to persistent storage
     * @param content content to be written to persistent storage
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    write(content: T): Promise<any> | void;
}

export interface PersistableOptions<T> {
    name: string;
    /**
     * Read, write and update functions to sync storage with writable
     */
    io: IO<T>;
    /**
     * Compare old and new writable value to determine whether to update
     */
    equal?: (a: T, b: T) => boolean;
}

export interface ErrorReadable<T> extends Readable<T> {
    error: Error;
}

const subscriber_queue = [];

export function persistable<K extends string, I>(
    options: {
        name: K,
        io: IO<I>,
        equal?: (a: I, b: I) => boolean,
    },
    default_value?: I,
) : {
        [P in K] : Writable<I>
    } & {
        [P in `${K}ReadStatus`] : ErrorReadable<IOStatus>;
    } & {
        [P in `${K}WriteStatus`] : ErrorReadable<IOStatus>;
    }

export function persistable<T>(
    options: PersistableOptions<T>,
    default_value?: T,
): Obj {
    const { name, io, equal = dequal } = options;
    const start: StartStopNotifier<T> = io.update || noop;

    let value: T;
    let initial_value: T;

    const status = {
        _read: "pending",
        _write: "done",
        get read() {
            return this._read;
        },
        set read(value) {
            if (this._read === value) return;
            this._read = value;
            call_subscribers(read_subscribers, value);
        },
        get write() {
            return this._write;
        },
        set write(value) {
            if (this._read === value) return;
            this._write = value;
            call_subscribers(write_subscribers, value);
        },
    };

    const read_subscribers: Set<SubscribeInvalidateTuple<IOStatus>> = new Set();
    const read_status_readable: ErrorReadable<IOStatus> = {
        subscribe(
            run: Subscriber<IOStatus>,
            invalidate: Invalidator<IOStatus> = noop,
        ) {
            return subscribe_io(
                read_subscribers,
                [run, invalidate],
                status.read,
            );
        },
        get: () => status.read,
        error: null,
        reset() {
            read_status_readable.error = null;
        },
    };

    const write_subscribers = new Set<SubscribeInvalidateTuple<IOStatus>>();
    const write_status_readable: ErrorReadable<IOStatus> = {
        subscribe(
            run: Subscriber<IOStatus>,
            invalidate: Invalidator<IOStatus> = noop,
        ) {
            return subscribe_io(
                write_subscribers,
                [run, invalidate],
                status.write,
            );
        },
        get: () => status.write,
        error: null,
        reset() {
            read_status_readable.error = null;
        },
    };

    function subscribe_io(
        subscribers: Set<SubscribeInvalidateTuple<IOStatus>>,
        subscriber: SubscribeInvalidateTuple<IOStatus>,
        initial: IOStatus,
    ): Unsubscriber {
        subscribers.add(subscriber);
        subscriber[0](initial);

        return () => {
            subscribers.delete(subscriber);
        };
    }

    function call_subscribers<T>(
        subscribers: Set<SubscribeInvalidateTuple<T>>,
        value: T | Promise<boolean>,
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

    let stop : Unsubscriber;
    const subscribers: Set<SubscribeInvalidateTuple<T>> = new Set();
    function set(new_value: T): void {
        if (!equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                call_subscribers(subscribers, value);
            }
        }
    }

    function subscribe(
        run: Subscriber<T>,
        invalidate: Invalidator<T> = noop,
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

    async function read() {
        try {
            status.read = "pending";
            const store_value = await io.read();
            if (store_value === null) {
                set(default_value);
                write(default_value);
            } else {
                set(store_value);
            }
            initial_value = value;

            status.read = "done";
            read_status_readable.error = null;
        } catch (error) {
            status.read = "error";
            read_status_readable.error = error;
        }
    }

    read();

    async function write(new_value) {
        status.write = "pending";
        try {
            if (!equal(value, new_value)) {
                await io.write(new_value);
            }
            status.write = "done";
            write_status_readable.error = null;
        } catch (error) {
            status.write = "error";
            write_status_readable.error = error;
        }
    }

    return {
        [name]: {
            update(fn) {
                this.set(fn(value));
            },
            subscribe,
            get: () => value,
            set(new_value) {
                set(new_value);
                write(new_value);
            },
            reset: () => value = initial_value,
        },
        [`${name}ReadStatus`]: read_status_readable,
        [`${name}WriteStatus`]: write_status_readable,
    };
}
