import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development", // On le désactive en dev pour éviter les caches agressifs
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSerwist(nextConfig);

