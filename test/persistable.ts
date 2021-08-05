import * as assert from "uvu/assert";
import { assert_readable, assert_writable } from "./store_test_utils";
import { describe } from "../scripts/test.js";
import { persistable } from "../src/lib/persistable";

describe("persistable", (it) => {
    it("creates named writable stores", () => {
        const stores = persistable({
            name: "count",
            io: {
                read: () => Promise.resolve(0),
                write: () => Promise.resolve(null),
            },
        });

        const { count, countReadStatus, countWriteStatus } = stores;

        assert_writable(count);
        assert_readable(countReadStatus, countWriteStatus);
    });

    it("read status is intially pending", () => {
        const { count, countReadStatus } = persistable({
            name: "count",
            io: {
                read: () => Promise.resolve(0),
                write: () => Promise.resolve(null),
            },
        });

        assert.equal(count.get(), undefined);
        assert.equal(countReadStatus.get(), "pending");
    });

    it("writes default value if read returns null", () => {
        const write_storage = [];
        const { value, valueReadStatus } = persistable({
            name: "value",
            io: {
                read: () => Promise.resolve(null),
                write: (count: number) => {
                    write_storage.push(count);
                    return Promise.resolve(null);
                },
            },
        }, "default value");

        const statuses = [];
        const unsubscribe = valueReadStatus.subscribe((status) => {
            statuses.push(status);
            if (status === "done") {
                assert.is(value.get(), "default value");
                assert.equal(write_storage, ["default value"]);
                assert.equal(statuses, ["pending", "done"]);
                unsubscribe();
            }
        });
    });

    it("sets status to error", () => {
        const { store, storeReadStatus, storeWriteStatus } = persistable({
            name: "store",
            io: {
                read: () => {
                    throw Error("Don't wanna read");
                },
                write: () => {
                    throw Error("I hate writing");
                },
            },
        }, -1 as number);

        storeReadStatus.subscribe((status) => {
            if (status === "pending" || status === "done") {
                assert.is(storeReadStatus.error, null);
            }
            if (status === "error") {
                assert.is(storeReadStatus.error.message, "Don't wanna read");
            }
        });
        storeWriteStatus.subscribe((status) => {
            if (status === "pending" || status === "done") {
                assert.is(storeWriteStatus.error, null);
            }
            if (status === "error") {
                assert.is(storeWriteStatus.error.message, "I hate writing");
            }
        });
        store.set(0);
    });

    it("checks for equality", () => {
        let value;
        let equal = true;
        const { count } = persistable({
            name: "count",
            io: {
                read: () => value,
                write: (v) => value = v,
            },
            equal: () => equal,
        });

        count.set(1);
        assert.is(count.get(), undefined);

        equal = false;
        count.set(1);
        assert.is(count.get(), 1);
    });
});
