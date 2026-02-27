export default [
  {
    ignores: [
      "node_modules/**",
      "android/**",
      "ios/**",
      ".expo/**",
      "coverage/**",
      "dist/**",
      "**/*.ts",
      "**/*.tsx",
    ],
  },
  {
    files: ["**/*.{js,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {},
  },
];
