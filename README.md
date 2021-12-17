# storables

Svelte's built-in stores are not always ergonomic when you have to mix them
with imperative code. Storables remedy this by letting you to embed logic
within a store's lifetime.

## checkable
`checkable` works like Svelte's `writable` but with built-in asynchronous validation.

### Features
- <details>
    <summary>✅ Asynchronous validation</summary>

    ```javascript
    const initialValue = "John Smith";
    const { username, usernameCheckStatus } = checkable({
        name: "username",
        async check(newUsername) {
            // This value is invalid, but I know what I'm doing.
            if (userIsTyping) return false;
            // This value is invalid, scream!
            if (await alreadyExists(newUsername)) {
                throw Error("Username already taken");
            }
            // This value is valid
            return true;
        },
    }, initialValue);
    ```

    `$usernameCheckStatus` is `"pending"` while validating the value asynchronously.

    `$usernameCheckStatus` is `"done"` when validation is complete.

    `$usernameCheckStatus` is `"error"` if the validation throws an error.

    In the above example, `usernameCheckStatus.error` is `Error("Username is already taken")` if
    `$usernameCheckStatus === "error"`. It is `null` otherwise.

    Unlike the transformable's `assert`, `check` is not write-blocking.

    The default/initial value is not validated.
</details>

<br>

## persistable
Persist your store's value in localStorage or your database —store it anywhere.

### Features
- <details>
    <summary>💾 Asynchronous storage</summary>

    ```javascript
    const defaultValue = 0;
    const { count } = persistable({
        name: "count",
        io: {
            read({ set }) {
                readFromDatabase()
                    .then(value => set(value))
                    .catch(() => defaultValue);
                const cleanUp = onDatabaseChange(value => set(value));
                return cleanUp;
            },
            write: (value, { set, error }) => {
                try {
                    writeToDatabase(value).then(value => set(value););
                } catch (e) {
                    error("Save unsuccessful. Please try again later.");
                }
            },
        },
    });
    ```
</details>

- <details>
    <summary>✅ Validation</summary>

    ```javascript
    const { count, countWriteStatus } = persistable({
        name: "count",
        io: {
            read: ({ set }) => {
                set(JSON.parse(localStorage.getItem("count")));
            },
            write: (value, { set, error }) => {
                if (isInvalid(value)) {
                    error("Heeyo! Value is invalid.");
                }
                localStorage.setItem("count", JSON.stringify(value));
                set(value);
            },
        },
    });
    ```

    `$countWriteStatus` is `"pending"` while writing value.

    `$countWriteStatus` is `"done"` when writing is complete.

    `$countWriteStatus` is `"error"` if the `write` throws an error.

    In the above example, `countWriteStatus.error` is `Error("Could not write invalid value")`
    if `$countWriteStatus === "error"`. It is `null` otherwise.
</details>

<br>

## transformable

If Svelte's built-in `writable` and `derived` stores had a baby, it would be `transformable`.

### Features
- <details>
    <summary>🔄 Two-way transforms (...more like many-way transforms)</summary>

    ```javascript
    const { dateObject, number } = transformable({
        name: "number",
        transforms: {
            dateObject: {
                to: (date) => date.getTime(),
                from: (number) => new Date(number),
            },
        },
    }, new Date().getTime());
    ```

    Updating `number` will call its own subscribers with `$number` and subscribers
    of `dateObject` with `new Date($number)`. Updating `dateObject` will call its own
    subscribers with `$dateObject` and subscribers of `number` with `$dateObject.getTime()`.

    This is handy if, for example, you want to display minutes to a user but your code
    thinks in milliseconds.
</details>

- <details>
    <summary>✅  Validation</summary>


    ```javascript
    const now = new Date().getTime()
    const { number, numberAssertStatus } = transformable({
        name: "number",
        assert(number) {
            // This is an invalid value, but I know what I'm doing.
            if (number === undefined) return false;
            // This is an error, scream!
            if (number < now) throw Error("Date must be after now");
            // This is a valid number
            return true;
        }
    }, now);
    ```

    `numberAssertStatus.error` is `Error("Date must be after now")` if
    `$numberAssertStatus === "error"`. It is `null` otherwise.

    `assert` is write-blocking. If it throws or returns `false` the value of the store
    will not change and subscribers will not be called.

    The default/initial value is not validated.
</details>
