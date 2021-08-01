import dts from "rollup-plugin-dts";
import { fileURLToPath } from "url";
import path from "path";
import typescript from "@rollup/plugin-typescript";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

export default [
    {
        input: [
            "src/lib/index.ts",
            "src/lib/transformable.ts",
        ],
        output: {
            dir: "dist",
            sourcemap: true,
        },
        plugins: [
            typescript(),
        ],
    },
    {
        input: [
            "dist/dts/index.d.ts",
            "dist/dts/transformable.d.ts",
        ],
        output: { dir: "dist" },
        plugins: [dts()],
    },
];
