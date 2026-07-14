import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextCoreWebVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "electron/**", "tests/**", "e2e/**", "dist-electron/**", "scripts/**"]),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-assign-module-variable": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
  {
    files: ["src/components/Products.tsx", "src/components/Cash.tsx"],
    rules: {
      // These files have inline eslint-disable for unused vars
      // but the rule definition itself is missing — ignore it
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);
