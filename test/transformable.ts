import * as assert from "uvu/assert";
import { describe } from "../scripts/test.js";
import { noop } from "../src/lib/utils";
import { transformable } from "../src/lib/transformable";

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
        }, 0);

        const names = [];
        for (const name in stores) names.push(name); // eslint-disable-line guard-for-in

        const expect = ["count", "countError", "string_count", "string_countError"];
        assert.equal(names, expect);

        const { count, string_count } = stores;

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

        assert.equal(counts, [0, 1, 2, 3, 31]);
        assert.equal(string_counts, ["0", "1", "2", "3", "31"]);
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

        assert.equal(values, ["writable", undefined, "error", undefined]);
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

        const errors = new Map();
        const {
            number, string, date, numberError, dateError, stringError,
        } = afterNow;

        function persistError(error) {
            if (error) {
                errors.set(error.transform, error);
            }
        }

        numberError.subscribe(persistError);
        dateError.subscribe(persistError);
        stringError.subscribe(persistError);

        // Error stores are all undefined to begin with
        assert.is(errors.size, 0);

        // Valid values triggers now errors
        const newNow = now + 1;
        number.set(newNow);
        assert.is(number.get(), newNow);
        assert.is(errors.size, 0);

        // Validation that returns an `Error` triggers error subscriber calls
        // Store is not modified. `update` is unsuccessful.
        number.update((now) => now - 10);
        assert.is(number.get(), newNow);
        assert.is(errors.size, 1);
        assert.ok(errors.has("number"));

        const wrongNow = String(Number(now) - 10);
        string.set(wrongNow);
        assert.is(number.get(), newNow);
        assert.is(errors.size, 2);
        assert.is(errors.get("string")?.value, wrongNow);

        // Validation that returns `false` triggers no subscriber calls
        // Store is not modified. `set` is unsuccessful.
        date.set(new Date(now - 1));
        assert.is(number.get(), newNow);
        assert.is(errors.size, 2);
        assert.not.ok(errors.has("date"));
    });
});
