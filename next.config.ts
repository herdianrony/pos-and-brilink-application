import type { NextConfig } from "next";

const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  // whatsapp-web.js has optional runtime dependencies (e.g. S3 unzipper paths)
  // that should stay external to Turbopack's server bundle.
  serverExternalPackages: ["whatsapp-web.js", "qrcode"],
  outputFileTracingExcludes: {
    "*": [
      "./.whatsapp-session/**/*",
      "./.data/**/*",
      "./node_modules/whatsapp-web.js/.wwebjs_auth/**/*",
      "./node_modules/whatsapp-web.js/.wwebjs_cache/**/*",
    ],
  },
  ...(allowedDevOrigins?.length ? { allowedDevOrigins } : {}),
};

export default nextConfig;
