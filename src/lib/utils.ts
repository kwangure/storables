/* eslint-disable */
export function has(object: unknown, property: PropertyKey): boolean {
    return Object.hasOwnProperty.call(object, property);
}

export function has_func(object: unknown, property: PropertyKey) {
    return has(object, property) && is_function(object[property]);
}

// https://github.com/darkskyapp/string-hash/blob/master/index.js
export function hash(str: string) {
    let hash = 5381;
    let i = str.length;

    while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return hash >>> 0 as unknown as string;
}

export function identity<Type>(x: Type): Type {
    return x;
}

export function is_function(thing: unknown): thing is Function {
    return typeof thing === "function";
}

export function noop(): void { }

export function valid(): boolean {
    return true;
}

export function safe_equal(a: unknown, b: unknown): boolean {
    return !(a != a
        ? b == b
        : a !== b || ((a && typeof a === "object") || typeof a === "function"));
}
