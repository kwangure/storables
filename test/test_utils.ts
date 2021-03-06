import * as assert from "uvu/assert";
import * as uvu from "uvu";
import { Readable, Writable } from "../src/lib/types";
import { has_func } from "../src/lib/utils";

export function describe(name: string, fn: (it: uvu.Test) => void): void {
    const suite = uvu.suite(name);
    fn(suite);
    suite.run();
}

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

        const counts = [];
        const unsubscribe = count.subscribe((value) => {
            counts.push(value);
        });

        count.set(0);
        assert.is(Number(count.get()), 0, Error("'set' input should be equal to 'get' output"));
        count.update((n) => {
            const value = Number(n);
            assert.is(value, 0, Error("'get' output should be equal to 'update' input"));
            return value + 1;
        });

        unsubscribe();

        count.set(3);
        count.update((n) => Number(n) + 1);

        assert.is(counts.length, 3, Error("'subscribe' should be called when 'set' or 'update' changes the store value"));
        count.reset?.();
    }
}

export function assert_readable(...stores: unknown[]): void {
    stores.forEach((store) => {
        assert.ok(store, Error(`Expected a truthy readable value. Received '${store}'`));

        // Narrow type to `Readable`
        if (is_readable(store)) {
            store.subscribe((value) => {
                assert.is(store.get(), value, Error("'subscribe' and 'get' should return the same value in readables"));
            })();
        }
    });
}
