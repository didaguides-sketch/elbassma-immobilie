import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cover images / logos served from the object storage provider (phase 5)
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
    ],
  },
  experimental: {
    serverActions: {
      // Server Actions default to a ~1MB body limit, far below our
      // MAX_DOCUMENT_SIZE_BYTES (50MB) in lib/validation/file.schema.ts.
      // Keep these two in sync if either changes.
      bodySizeLimit: "55mb",
    },
  },
  // Production readiness hardening — baseline headers only. Deliberately
  // NOT a CSP (this app serves S3/R2-hosted images, NextAuth, and Server
  // Actions; a CSP tight enough to matter risks breaking one of those
  // without careful per-provider tuning) and NOT Strict-Transport-Security
  // (HSTS is only safe to claim once the actual production deployment is
  // confirmed to always terminate HTTPS — that's a deployment-time fact,
  // not something this repo can assert for every hosting target).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
