import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...tseslint.configs.recommended,
  globalIgnores([
    "node_modules/**",
    "src-tauri/**",
    "src-tauri-ui/dist/**",
    "wa-service/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
]);
