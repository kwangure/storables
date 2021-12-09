import type {
    IOReadable,
    IOStatus,
    State,
    StoreWrite,
    SubscribeInvalidateTuple,
    Unsubscriber,
    Updater,
    Writable,
} from "./types";
import { set, subscribe } from "./store";
import { dequal } from "dequal/lite";
import { ValueError } from "./utils";

interface Obj {
    [key: string]: unknown;
}

export interface IO<T> {
    /**
     * Start and stop notification callbacks.
     */
    read(write: StoreWrite<T>): Unsubscriber | void;

    /**
     * Write value to persistent storage
     * @param content content to be written to persistent storage
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    write(content: T, write: StoreWrite<T>): void;
}

export interface PersistableOptions<T> {
    /**
     * Compare old and new writable value to determine whether to update
     * @param a the previous value
     * @param b the new value
     */
    equal?: (a: T, b: T) => boolean;
    /**
     * Read, write and update functions to sync storage with writable
     */
    io: IO<T>;
    name: string;
}

export function persistable<K extends string, I>(
    options: {
        equal?: (a: I, b: I) => boolean,
        io: IO<I>,
        name: K
    },
) : {
        [P in K] : Writable<I>
    } & {
        [P in `${K}ReadStatus`] : IOReadable<I>;
    } & {
        [P in `${K}WriteStatus`] : IOReadable<I>;
    }

export function persistable<T>(
    options: PersistableOptions<T>,
): Obj {
    const { name, io, equal = dequal } = options;

    let value: T;
    const persistable_state: State<T> = {
        equal,
        start,
        get value() {
            return value;
        },
        set value(v: T) {
            value = v;
        },
        ready: false,
        subscribers: new Set<SubscribeInvalidateTuple<T>>(),
    };

    let write_status : IOStatus = "done";
    const write_state : State<IOStatus> = {
        equal: dequal,
        ready: false,
        subscribers: new Set<SubscribeInvalidateTuple<IOStatus>>(),
        get value() {
            return write_status;
        },
        set value(v : IOStatus) {
            write_status = v;
        },
    };

    let read_status:IOStatus = "pending";
    const read_state : State<IOStatus> = {
        equal: dequal,
        ready: false,
        subscribers: new Set<SubscribeInvalidateTuple<IOStatus>>(),
        get value() {
            return read_status;
        },
        set value(v : IOStatus) {
            read_status = v;
        },
    };

    const read_readable: IOReadable<T> = {
        subscribe: subscribe.bind(null, read_state),
        get: () => read_status,
        reset: () => {
            read_status = "done";
            read_readable.error = null;
        },
        error: null,
    };
    const write_readable: IOReadable<T> = {
        subscribe: subscribe.bind(null, write_state),
        get: () => write_status,
        reset: () => {
            write_status = "done";
            write_readable.error = null;
        },
        error: null,
    };

    const writable = {
        get: (): T => value,
        set: (new_value: T) => {
            write_readable.error = null;
            set<IOStatus>(write_state, "pending");
            const write = {
                set: (new_value) => {
                    set<IOStatus>(write_state, "done");
                    set<T>(persistable_state, new_value);
                },
                update(fn : Updater<T>) {
                    write.set(fn(value));
                },
                error: (message: string) => {
                    write_readable.error = new ValueError(message, new_value);
                    set<IOStatus>(write_state, "error");
                },
            };
            io.write(new_value, write);
        },
        subscribe: subscribe.bind(null, persistable_state),
        update(fn: Updater<T>) {
            writable.set(fn(value));
        },
    };

    function start() {
        set<IOStatus>(read_state, "pending");
        const write = {
            set(new_value) {
                set<IOStatus>(read_state, "done");
                read_readable.error = null;
                set<T>(persistable_state, new_value);
            },
            update(fn: Updater<T>) {
                write.set(fn(value));
            },
            error: (message: string) => {
                read_readable.error = new ValueError(message, null);
                set<IOStatus>(read_state, "error");
            },
        };
        return io.read(write);
    }

    return {
        [name]: writable,
        [`${name}ReadStatus`]: read_readable,
        [`${name}WriteStatus`]: write_readable,
    };
}
