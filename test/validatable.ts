import * as assert from "uvu/assert";
import { assert_readable, assert_writable, describe } from "./test_utils";
import { debouncible } from "../src/lib/debouncible";
import { noop } from "../src/lib/utils";
import { validatable } from "../src/lib/validatable";

// TODO: `invalidate`-`svelte/store/derived` tests

describe("validatable", (it) => {
    it("creates named writable stores", () => {
        const stores = validatable({
            name: "count",
            validate: () => true,
        }, undefined as number);

        const { count, countValidationStatus } = stores;

        assert_writable(count);
        assert_readable(countValidationStatus);

        const counts = [];
        const unsubscribe = count.subscribe((value) => {
            counts.push(value);
        });

        count.set(1);
        count.update((n) => n + 1);

        count.set(3);
        count.update((n) => n + 1);

        unsubscribe();

        count.set(4);
        count.update((n) => n + 1);

        assert.equal(counts, [undefined, 1, 2, 3, 4]);
    });

    it("creates undefined writable stores", () => {
        const { writable, writableValidationStatus } = validatable({ name: "writable" });
        const values = [];

        writable.subscribe((value) => {
            values.push("writable", value);
        })();
        writableValidationStatus.subscribe((value) => {
            values.push("error", value);
        })();

        assert.equal(values, ["writable", undefined, "error", "done"]);
    });

    it("calls start and stop notifiers", () => {
        let called = 0;

        const { writable } = validatable({
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

        const { number, numberValidationStatus } = validatable({
            name: "number",
            validate(newNow) {
                // This is an error, but I know what I'm doing
                if (typeof newNow === "string") return false;
                // This is an error, scream!
                if (newNow < now) return Error("Date must be after now");
                // This is not an error
                return true;
            },
        }, now);

        assert.is(numberValidationStatus.get(), "done", Error("Initial value should be assumed to be valid"));

        const newNow = now + 1;
        const oldNow = now - 1;
        debouncible(numberValidationStatus, (value) => {
            const { error } = numberValidationStatus;
            if (value === "pending") {
                assert.is(error, null);
            }
            if (value === "done") {
                assert.is(error, null, Error("Store should not error on valid values"));

                // The validation of `newNow` is thrown away because it is asynchronous
                // but `String(oldNow)` is called immediately after synchronously
                assert.is.not(number.get(), newNow, "Validation should be asynchronous");
                assert.is(number.get(), `${oldNow}`);
            }
            if (value === "error") {
                assert.is(error?.value, oldNow, Error("Store should error on invalid values"));
            }
        });

        number.set(newNow);
        number.set(oldNow);

        // @ts-expect-error string values should error quietly
        number.update((now) => String(now));

    });

    it("checks for equality", () => {
        let equal = true;
        const { count } = validatable({
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
