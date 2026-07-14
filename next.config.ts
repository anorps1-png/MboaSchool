import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development", // On le désactive en dev pour éviter les caches agressifs
});

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry enveloppe la config Next. Sans DSN à l'exécution, l'app n'envoie rien
// (voir instrumentation*.ts). L'upload des sourcemaps ne se fait qu'avec un
// SENTRY_AUTH_TOKEN présent ; sinon cette étape est simplement ignorée.
export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Ne pas faire échouer le build si l'upload des sourcemaps est impossible.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  disableLogger: true,
  telemetry: false,
  // Pas d'appels réseau ni d'instrumentation superflue au build.
  automaticVercelMonitors: false,
  widenClientFileUpload: false,
});

