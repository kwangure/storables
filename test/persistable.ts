import * as assert from "uvu/assert";
import { assert_readable, assert_writable, describe } from "./test_utils";
import { noop } from "../src/lib/utils";
import { persistable } from "../src/lib/persistable";

// TODO: block calls to `store.set` and `store.update` before `io.read` is done
// TODO: test read StopNotifier/cleanup
// TODO: clean up output type into one interface object. Remove `&`s.

describe("persistable", (it) => {
    it("creates named writable stores", () => {
        const stores = persistable<"count", number>({
            name: "count",
            io: {
                read: noop,
                write: (value, { set }) => {
                    set(value);
                },
            },
        });

        const { count, countReadStatus, countWriteStatus } = stores;

        assert_writable(count);
        assert_readable(countReadStatus, countWriteStatus);
    });

    it("read status is initially pending", () => {
        const { count, countReadStatus } = persistable({
            name: "count",
            io: {
                read: noop,
                write: () => Promise.resolve(null),
            },
        });

        assert.equal(count.get(), undefined);
        assert.equal(countReadStatus.get(), "pending");
    });

    it("sets status to error", () => {
        const { store, storeReadStatus, storeWriteStatus } = persistable({
            name: "store",
            io: {
                read: ({ error }) => {
                    error("Don't wanna read");
                },
                write: (value, { error }) => {
                    error("I hate writing");
                },
            },
        });
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

        // Trigger read error
        store.subscribe(noop)();
        // Trigger write error
        store.set(0);
    });

    it("checks for equality", () => {
        let equal = true;
        const { count } = persistable({
            name: "count",
            io: {
                read: noop,
                write: (value, { set }) => {
                    set(value);
                },
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
