import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Resolve hoisted workspace deps from root node_modules
const rootNm = path.resolve(__dirname, "../node_modules");

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "tailwind-merge": path.resolve(rootNm, "tailwind-merge"),
      "clsx": path.resolve(rootNm, "clsx"),
      "recharts": path.resolve(rootNm, "recharts"),
      "chart.js": path.resolve(rootNm, "chart.js"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
