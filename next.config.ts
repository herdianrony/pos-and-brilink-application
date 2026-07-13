import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle Next.js server menjadi standalone — bisa dijalankan tanpa node_modules
  // penuh. Dipakai oleh Electron untuk spawn server lokal.
  output: "standalone",
  // AssetPrefix tidak disetel — Next.js di-serve di localhost:PORT oleh
  // Electron main process.
  // Matikan telemetry saat build untuk konsistensi.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as NextConfig;

export default nextConfig;
