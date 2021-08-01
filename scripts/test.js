import * as uvu from "uvu";

export function describe(name, fn) {
    const suite = uvu.suite(name);
    fn(suite);
    suite.run();
}
