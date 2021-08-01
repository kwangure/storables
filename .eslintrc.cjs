module.exports = {
    extends: [
        "@kwangure/eslint-config-svelte",
    ],
    settings: {
        "svelte3/typescript": () => require("typescript"),
    },
    overrides: [
        {
            files: ["**/*.ts"],
            extends: [
                "plugin:@typescript-eslint/eslint-recommended",
                "plugin:@typescript-eslint/recommended",
                "plugin:import/typescript"
            ],
            parser: "@typescript-eslint/parser",
            parserOptions: {
                sourceType: "module",
                ecmaVersion: 2019,
            },
            env: {
                browser: true,
                es2017: true,
                node: true,
            },
            plugins: ["@typescript-eslint"],
        },
    ],
};
