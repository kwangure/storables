/** Callback to inform of a value updates. */
export type Subscriber<T> = (value: T) => void;

/** Unsubscribes from value updates. */
export type Unsubscriber = () => void;

/** Callback to update a value. */
export type Updater<T> = (value: T) => T;

/** Start and stop notification callbacks. */
export type StartStopNotifier<T> = (set: Subscriber<T>) => Unsubscriber | void;

/** Cleanup logic callback. */
export type Invalidator<T> = (value?: T) => void;

/** Pair of subscriber and invalidator. */
export type SubscribeInvalidateTuple<T> = [Subscriber<T>, Invalidator<T>];

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
