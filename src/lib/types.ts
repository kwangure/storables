/** Callback to inform of a value updates. */
export type Subscriber<T = unknown> = (value: T) => void;

/** Unsubscribes from value updates. */
export type Unsubscriber = () => void;

/** Callback to update a value. */
export type Updater<T = unknown> = (value: T) => T;

/** Start and stop notification callbacks. */
export type StartStopNotifier<T> = (set: Subscriber<T>) => Unsubscriber | void;

/** Guard writable from invalid values */
export type Validator<T> = (value?: T) => (boolean | Error);

/** Validate writable from invalid values */
export type AsyncValidator<T> = (value?: T)
    => Promise<boolean | Error> | (boolean | Error);

/** Cleanup logic callback. */
export type Invalidator<T = unknown> = (value?: T) => void;

/** Pair of subscriber and invalidator. */
export type SubscribeInvalidateTuple<T> = [Subscriber<T>, Invalidator<T>];

/** Compare if two values are equal */
export type Equal<T> = (a: T, b: T) => boolean;

export type ErrorSubscriber<T> = SubscribeInvalidateTuple<TransformError<T>>;

/** A writable's internal state */
export interface State<T> {
	start?: StartStopNotifier<T>;
	stop?: Unsubscriber;
	value: T;
	equal?: Equal<T>,
	subscribers: Set<SubscribeInvalidateTuple<T>>,
	ready?: boolean;
}

/** Transform to new value */
export interface Transformer<T1, T2> {
    name: string;
    fn: (value: T1) => T2;
}

export interface TransformError<T> extends Error {
    value: T;
}

export interface Readable<T> {
    /**
	 * Subscribe on value changes.
	 * @param run subscription callback
	 * @param invalidate cleanup callback
	 */
	subscribe(
        this: void,
        run: Subscriber<T>,
        invalidate?: Invalidator<T>
    ): Unsubscriber;

    /**
	 * Get store value.
	 */
	get(this: void): T;

	/**
	 * Revert store to its original value
	 */
	reset(this: void): void;
}

export interface Writable<T> extends Readable<T> {
    /**
	 * Set value and inform subscribers.
	 * @param value to set
	 */
	set(this: void, value: T): void;

	/**
	 * Update value using callback and inform subscribers.
	 * @param updater callback
	 */
	update(this: void, updater: Updater<T>): void;
}

export type IOStatus = "pending" | "done" | "error";

export interface IOReadable<T> extends Readable<IOStatus> {
	error: Error & { value: T }
}
