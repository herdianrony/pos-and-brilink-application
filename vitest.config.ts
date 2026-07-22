import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    // Default node environment untuk non-component tests
    // Component tests pakai jsdom via // @vitest-environment jsdom comment
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/lib/**", "src/components/**", "src/app/api/**", "src/proxy.ts"],
      exclude: ["node_modules", ".next", "electron"],
    },
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
