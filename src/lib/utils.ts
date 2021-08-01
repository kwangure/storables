// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop(): void { }

export function identity<Type>(x: Type): Type {
    return x;
}

export function valid(): boolean {
    return true;
}

export function safe_not_equal(a: unknown, b: unknown): boolean {
    return a != a // eslint-disable-line no-self-compare
        ? b == b // eslint-disable-line no-self-compare
        : a !== b || ((a && typeof a === "object") || typeof a === "function");
}
