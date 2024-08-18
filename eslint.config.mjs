import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends("eslint:recommended"), {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
            chrome: true,
            jsu: true,
        },

        ecmaVersion: "latest",
        sourceType: "commonjs",

        parserOptions: {
            impliedStrict: true,
        },
    },

    rules: {
        indent: ["warn", 4, {
            SwitchCase: 1,
        }],

        "no-console": ["error", {
            allow: ["error"],
        }],

        "dot-notation": ["error", {
            allowKeywords: false,
        }],

        "prefer-const": "error",
        "prefer-arrow-callback": "error",
        "no-var": "error",
        "no-multi-spaces": "warn",
        "no-useless-escape": "off",
        "no-unused-vars": "off",
        "space-infix-ops": "warn",
        "arrow-spacing": "warn",
        "func-call-spacing": "error",
        "space-in-parens": "warn",
        "array-bracket-spacing": "warn",
        "object-curly-spacing": "warn",
        "computed-property-spacing": "warn",
        "keyword-spacing": "warn",
        "comma-spacing": "warn",
        quotes: "warn",
        semi: "warn",
    },
}];