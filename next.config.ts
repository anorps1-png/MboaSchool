import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development", // On le désactive en dev pour éviter les caches agressifs
});

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sql.js'],
};

export default isDev
  ? nextConfig
  : withSentryConfig(withSerwist(nextConfig), {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      disableLogger: true,
      telemetry: false,
      automaticVercelMonitors: false,
      widenClientFileUpload: false,
    });

