import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // No auth token configured yet -> source map upload is skipped at build
  // time (a harmless warning, not a build failure) until SENTRY_AUTH_TOKEN
  // is added as an env var.
  widenClientFileUpload: true,
});
