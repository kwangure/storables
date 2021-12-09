/**
 * TODO: Bikeshed naming conventions. Because I didn't want to overshadow
 * the `Set` builtin, I use `StoreSet` which has started a chain reaction
 * of types that should probably be renamed for the sake of consistency.
 *
 * Consistency with `svelte/store` types might be worth contending with too.
 */

/** Callback to inform of a value updates. */
export type Subscriber<T = unknown> = (value: T) => void;

/** Unsubscribes from value updates. */
export type Unsubscriber = () => void;

/** Callback to update a value. */
export type Updater<T = unknown> = (value: T) => T;

/** Set value and inform subscribers. */
export type StoreSet<T> = (this: void, value: T) => void;

/** Update value using callback and inform subscribers. */
export type StoreUpdate<T> = (this: void, updater: Updater<T>) => void;

/** Set the error status of a store */
export type StoreError<T>
	= (this: void, error: string | ValuedError<T>) => void;

export interface StoreWrite<T> {
	error: StoreError<T>;
	set: StoreSet<T>;
	update: StoreUpdate<T>
}

/** Start and stop notification callbacks. */
export type StartStopNotifier<T> = (set: Subscriber<T>) => Unsubscriber | void;

/** Guard writable from invalid values */
export type Assertor<T> = (value?: T) => boolean | never;

/** Validate a writable's value */
export type Checker<T> = (value?: T) => Promise<boolean> | boolean | never;

/** Cleanup logic callback. */
export type Invalidator<T = unknown> = (value?: T) => void;

/** Pair of subscriber and invalidator. */
export type SubscribeInvalidateTuple<T> = [Subscriber<T>, Invalidator<T>];

/** Compare if two values are equal */
export type Equal<T> = (a: T, b: T) => boolean;

/** A writable's internal state */
export interface State<T> {
	equal?: Equal<T>,
	ready?: boolean;
	start?: StartStopNotifier<T>;
	stop?: Unsubscriber;
	subscribers: Set<SubscribeInvalidateTuple<T>>,
	value: T;
}

/** Transform to new value */
export interface Transformer<T1, T2> {
    fn: (value: T1) => T2;
    name: string;
}

export interface ValuedError<T> extends Error {
    value: T;
}

export interface Readable<T> {
	/**
	 * Get store value.
	 */
	get(this: void): T;

	/**
	 * Revert store to its original value
	 */
	reset(this: void): void;

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
}

export type Writable<T> = Readable<T> & StoreWrite<T>

export type IOStatus = "pending" | "done" | "error";

export interface IOReadable<T> extends Readable<IOStatus> {
	error: ValuedError<T>
}
