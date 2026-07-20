const js = require("@eslint/js");
const pluginVue = require("eslint-plugin-vue");
const globals = require("globals");

module.exports = [
  {
    ignores: ["dist/**", "coverage/**", ".vercel/**", "test-results/**"],
  },
  js.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    files: ["**/*.{js,mjs,cjs,vue}"],
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        __APP_RELEASE__: "readonly",
      },
    },
    rules: {
      "no-console":
        process.env.NODE_ENV === "production"
          ? ["warn", { allow: ["warn", "error"] }]
          : "off",
      "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "no-useless-assignment": "off",
      "preserve-caught-error": "off",
      "vue/multi-word-component-names": "off",
    },
  },
  {
    files: ["tests/**/*.spec.js", "tests/**/*.test.js"],
    languageOptions: {
      globals: globals.vitest,
    },
  },
];
