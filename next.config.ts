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
  // Une CSP correcte exigerait soit des nonces (donc de forcer le rendu
  // dynamique sur toutes les pages, cf. next/dist/docs CSP guide), soit
  // 'unsafe-inline' sur script-src à cause du payload RSC inline de l'App
  // Router — changement structurel à tester à part. Ces 5 headers n'ont
  // aucun impact sur le rendu ou les requêtes déjà émises par l'app.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
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

