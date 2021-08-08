import * as assert from "uvu/assert";
import { assert_readable, assert_writable, describe } from "./test_utils";
import { noop } from "../src/lib/utils";
import { transformable } from "../src/lib/transformable";

// TODO: `invalidate`-`svelte/store/derived` tests
// TODO: start and stop are called only once
// TODO: Set after error reverts error to null

describe("transformable", (it) => {
    it("creates named writable stores", () => {
        const stores = transformable({
            name: "count",
            transforms: {
                string_count: {
                    to: Number,
                    from: String,
                },
            },
        }, undefined as number);

        const { count, countError, string_count, string_countError } = stores;

        assert_writable(count, string_count);
        assert_readable(countError, string_countError);

        const counts = [];
        const unsubscribe_c = count.subscribe((value) => {
            counts.push(value);
        });

        const string_counts = [];
        const unsubscribe_s = string_count.subscribe((value) => {
            string_counts.push(value);
        });

        count.set(1);
        count.update((n) => n + 1);

        string_count.set("3");
        string_count.update((n) => `${n}1`);

        unsubscribe_c();
        unsubscribe_s();

        count.set(4);
        count.update((n) => n + 1);

        string_count.set("5");
        string_count.update((n) => `${n}2`);

        assert.equal(counts, [undefined, 1, 2, 3, 31]);
        assert.equal(string_counts, ["undefined", "1", "2", "3", "31"]);
    });

    it("creates undefined writable stores", () => {
        const { writable, writableError } = transformable({ name: "writable" });
        const values = [];

        writable.subscribe((value) => {
            values.push("writable", value);
        })();
        writableError.subscribe((value) => {
            values.push("error", value);
        })();

        assert.equal(values, ["writable", undefined, "error", null]);
    });

    it("calls start and stop notifiers", () => {
        let called = 0;

        const { writable } = transformable({
            name: "writable",
            start() {
                called += 1;
                return function stop() {
                    called -= 1;
                };
            },
        }, 0);

        const unsubscribe1 = writable.subscribe(noop);
        assert.equal(called, 1);

        const unsubscribe2 = writable.subscribe(noop);
        assert.equal(called, 1);

        unsubscribe1();
        assert.equal(called, 1);

        unsubscribe2();
        assert.equal(called, 0);
    });

    it("does not assume date is immutable", () => {
        const obj = {};
        let called = 0;

        const { store } = transformable({ name: "store" }, obj);

        const unsubscribe = store.subscribe(() => {
            called += 1;
        });

        store.set(obj);
        assert.equal(called, 2);

        store.update((obj) => obj);
        assert.equal(called, 3);

        unsubscribe();
    });

    it("calls error subscribers with invalid value", () => {
        const now = new Date().getTime();

        const afterNow = transformable({
            name: "number",
            transforms: {
                string: {
                    from: String,
                    to: Number,
                    validate: () => Error("Unhelpful string error."),
                },
                date: {
                    from: (number: number) => new Date(number),
                    to: (date: Date) => date.getTime(),
                    validate: () => false,
                },
            },
            validate(newNow) {
                if (newNow < now) {
                    return Error("Date must be after now");
                }
                return true;
            },
        }, now);

        const errors = new Set();
        const {
            number, string, date, numberError, dateError, stringError,
        } = afterNow;

        function persistError(error) {
            if (error) {
                errors.add(error);
            }
        }

        numberError.subscribe(persistError);
        dateError.subscribe(persistError);
        stringError.subscribe(persistError);

        // Error stores are all undefined to begin with
        assert.is(errors.size, 0, Error("All error stores should begin empty"));

        // Valid values triggers now errors
        const newNow = now + 1;
        number.set(newNow);
        assert.is(number.get(), newNow);
        assert.is(errors.size, 0, Error("Store should not error on valid values"));

        // Validation that returns an `Error` triggers error subscriber calls
        // Store is not modified. `update` is unsuccessful.
        number.update((now) => now - 10);
        assert.is(number.get(), newNow);
        assert.is(errors.size, 1);

        const wrongNow = String(Number(now) - 10);
        string.set(wrongNow);
        assert.is(number.get(), newNow);
        assert.is(errors.size, 2);

        // Validation that returns `false` triggers no subscriber calls
        // Store is not modified. `set` is unsuccessful.
        date.set(new Date(now - 1));
        assert.is(number.get(), newNow);
        assert.is(errors.size, 2);
    });

    it("checks for equality", () => {
        let equal = true;
        const { count } = transformable({
            name: "count",
            equal: () => equal,
        }, 0);

        count.set(1);
        assert.is(count.get(), 0);

        equal = false;
        count.set(1);
        assert.is(count.get(), 1);
    });
});
