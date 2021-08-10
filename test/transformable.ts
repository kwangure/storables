import * as assert from "uvu/assert";
import { assert_readable, assert_writable, describe } from "./test_utils";
import { noop } from "../src/lib/utils";
import { transformable } from "../src/lib/transformable";

// TODO: `invalidate`-`svelte/store/derived` tests

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

        const {
            count,
            countAssertStatus,
            string_count,
            string_countAssertStatus,
        } = stores;

        assert_writable(count, string_count);
        assert_readable(countAssertStatus, string_countAssertStatus);

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

    it("preserves transforms for all methods", () => {
        const { count, string_count } = transformable({
            name: "count",
            transforms: {
                string_count: {
                    to: Number,
                    from: String,
                },
            },
        }, 0);

        function assert_type(expect: assert.Types, value: unknown) {
            const type = typeof value;
            assert.is(type, expect, Error(`Expected ${expect}, saw '${value}' (${type})'`));
            return value;
        }

        const is_number = assert_type.bind(undefined, "number");
        const is_string = assert_type.bind(undefined, "string");

        count.subscribe(is_number)();
        string_count.subscribe(is_string)();

        is_number(count.get());
        is_string(string_count.get());

        count.update(is_number);
        string_count.update(is_string);
    });

    it("creates undefined writable stores", () => {
        const { writable, writableAssertStatus } = transformable({ name: "writable" });
        const values = [];

        writable.subscribe((value) => {
            values.push("writable", value);
        })();
        writableAssertStatus.subscribe((value) => {
            values.push("assert", value);
        })();

        assert.equal(values, ["writable", undefined, "assert", "done"]);
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

    it("calls error subscribers with invalid value", () => {
        const now = new Date().getTime();

        const {
            number,
            date,
            string,
            numberAssertStatus,
            dateAssertStatus,
            stringAssertStatus,
        } = transformable({
            name: "number",
            transforms: {
                string: {
                    from: String,
                    to: Number,
                    assert: () => {
                        throw Error("Unhelpful string error.");
                    },
                },
                date: {
                    from: (number: number) => new Date(number),
                    to: (date: Date) => date.getTime(),
                    assert: () => false,
                },
            },
            assert(newNow) {
                if (newNow < now) {
                    throw Error("Date must be after now");
                }
                return true;
            },
        }, now);

        assert.is(numberAssertStatus.get(), "done", Error("Initial value should be assumed to be valid"));
        assert.is(dateAssertStatus.get(), "done", Error("Initial value should be assumed to be valid"));
        assert.is(stringAssertStatus.get(), "done", Error("Initial value should be assumed to be valid"));

        const newNow = now + 1;
        const oldNow = now - 1;

        number.set(newNow);
        assert.is(numberAssertStatus.error, null, Error("Store should not error on valid values"));

        number.set(oldNow);
        assert.is(numberAssertStatus.error?.value, oldNow, Error("Store should error on invalid values"));

        date.set(new Date());
        assert.is(number.get(), newNow, Error("Store should ignore falsy assertion"));
        assert.is(dateAssertStatus.error, null, Error("Store should not error on ignored values"));

        const stringNewNow = String(newNow);
        string.set(stringNewNow);
        assert.is(stringAssertStatus.error?.value, stringNewNow, Error("Transform should error on invalid values"));
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
