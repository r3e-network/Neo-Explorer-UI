module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  extends: ["plugin:vue/vue3-essential", "eslint:recommended"],
  parserOptions: {
    parser: "@babel/eslint-parser",
    requireConfigFile: false,
    ecmaVersion: 2021,
    sourceType: "module",
  },
  rules: {
    "no-console":
      process.env.NODE_ENV === "production"
        ? ["warn", { "allow": ["warn", "error"] }]
        : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "vue/multi-word-component-names": "off",
  },
};
