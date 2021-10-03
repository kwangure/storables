import * as assert from "uvu/assert";
import { assert_readable, assert_writable, describe } from "./test_utils";
import { on } from "../src/lib/utils";
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

    it("writes default value if read returns undefined", async function named() {
        const write_storage = [];
        const { value, valueReadStatus } = persistable({
            name: "value",
            io: {
                read: () => Promise.resolve(undefined),
                write: (count: number) => {
                    write_storage.push(count);
                    return Promise.resolve(null);
                },
            },
        }, "default value");

        await on("done", valueReadStatus);

        assert.is(value.get(), "default value", Error("Store should set default value if read is unsucessful."));
        assert.equal(write_storage, ["default value"], Error("Store should write default value if read is unsucessful."));

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
