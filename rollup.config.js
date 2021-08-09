import dts from "rollup-plugin-dts";
import { fileURLToPath } from "url";
import node from "@rollup/plugin-node-resolve";
import path from "path";
import typescript from "@rollup/plugin-typescript";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

export default [
    {
        input: [
            "src/lib/index.ts",
            "src/lib/transformable.ts",
            "src/lib/persistable.ts",
        ],
        output: {
            dir: "dist",
            sourcemap: true,
        },
        plugins: [
            node(),
            typescript(),
        ],
    },
    {
        input: [
            "dist/dts/index.d.ts",
            "dist/dts/transformable.d.ts",
            "dist/dts/persistable.d.ts",
        ],
        output: { dir: "dist" },
        plugins: [dts()],
    },
];
