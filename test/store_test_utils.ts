import * as assert from "uvu/assert";
import { Readable, Writable } from "../src/lib/types";
import { has_func } from "../src/lib/utils";

export function is_writable(thing: unknown): thing is Writable<unknown> {
    const expected_funcs = ["get", "set", "update", "subscribe"];

    expected_funcs.forEach((func) => {
        assert.ok(has_func(thing, func), Error(`Writable missing ${func} function`));
    });

    return true;
}

export function is_readable(thing: unknown): thing is Readable<unknown> {
    const expected_funcs = ["get", "subscribe"];
    const unexpected_funcs = ["update", "set"];

    expected_funcs.forEach((func) => {
        assert.ok(has_func(thing, func), Error(`Readable missing '${func}' function`));
    });

    unexpected_funcs.forEach((func) => {
        assert.not.ok(has_func(thing, func), Error(`Readable should not have '${func}' function`));
    });

    return true;
}

export function assert_writable(...stores: unknown[]): void {
    for (const count of stores) {
        assert.ok(count, Error(`Expected a truthy writable value. Received '${count}'`));

        // Narrow type to `Writable`
        if (!is_writable(count)) return;

        const intial = count.get();

        const counts = [];
        const unsubscribe = count.subscribe((value) => {
            counts.push(value);
        });

        count.set(0);
        count.update((n) => Number(n) + 1);

        unsubscribe();

        count.set(3);
        count.update((n) => Number(n) + 1);

        assert.equal(counts, [intial, 0, 1]);
        assert.equal(count.get(), 4);
    }
}

export function assert_readable(...stores: unknown[]): boolean {
    stores.forEach((store) => {
        assert.ok(is_readable(store), Error("Store is not a readable"));

        // Narrow type to `Readable`
        if (is_readable(store)) {
            store.subscribe((value) => {
                assert.is(store.get(), value);
            })();
        }
    });

    return true;
}
