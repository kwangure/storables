import dts from "rollup-plugin-dts";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import node from "@rollup/plugin-node-resolve";
import path from "path";
import typescript from "@rollup/plugin-typescript";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

const DEV = Boolean(process.env.ROLLUP_WATCH);

function remove(options = {}) {
    const { hook = "renderStart" } = options;
    return {
        name: "empty-dir",
        [hook]: async (rollupOutputOptions) => {
            const dir = options.dir || rollupOutputOptions.dir;
            if (dir) await fs.remove(dir);
        },
    };
}

export default [
    {
        input: [
            "src/lib/index.ts",
            "src/lib/transformable.ts",
            "src/lib/persistable.ts",
            "src/lib/checkable.ts",
        ],
        output: {
            dir: "dist",
            chunkFileNames: "chunks/[name]-[hash].js",
            sourcemap: false,
        },
        plugins: [
            remove(),
            node(),
            typescript({
                sourceMap: DEV,
            }),
        ],
    },
    {
        input: [
            "dist/dts/index.d.ts",
            "dist/dts/transformable.d.ts",
            "dist/dts/persistable.d.ts",
            "dist/dts/checkable.d.ts",
        ],
        output: {
            dir: "dist",
            chunkFileNames: "chunks/[name]-[hash].d.ts",
        },
        plugins: [
            dts(),
            remove({
                hook: "writeBundle",
                dir: "dist/dts",
            }),
        ],
    },
];
