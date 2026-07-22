import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default defineConfig([
  ...tseslint.configs.recommended,
  ...reactHooks.configs.recommended,
  {
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "react-refresh/only-export-components": "warn",
    },
  },
  globalIgnores([
    "node_modules/**",
    "src-tauri/**",
    "src-tauri-ui/dist/**",
    "wa-service/**",
  ]),
]);
