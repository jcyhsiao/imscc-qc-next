import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
    rules: {
      "@typescript-eslint/strict-boolean-expressions": "error",
    },
    ignores: ["./ui/ideas/*"],
  },
  tseslint.configs.strictTypeChecked,
  pluginReact.configs.flat.recommended,
]);
