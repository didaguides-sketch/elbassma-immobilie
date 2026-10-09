import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Framework choice: Vitest.
 *
 * The project had zero test frameworks installed before this (checked
 * package.json + package-lock.json — no Jest, no Playwright, no Vitest,
 * no config files anywhere in the repo). Vitest was chosen over Jest
 * because:
 *   - Native ESM + TypeScript support with no transform config needed —
 *     this project uses "module": "esnext" / "moduleResolution": "bundler"
 *     in tsconfig.json, which Jest requires extra ts-jest/babel config to
 *     handle correctly; Vitest handles it out of the box via esbuild.
 *   - It's Vite-based, so the same tsconfig path aliases (@/*) resolve
 *     without a separate babel-plugin-module-resolver style setup.
 *   - It's the de-facto standard for Next.js 13+/App Router projects as
 *     of 2025-2026, so this won't be an unfamiliar choice to future
 *     contributors.
 * Playwright was NOT chosen because this suite is unit/integration-level
 * (service functions + a real Postgres DB), not browser E2E — adding a
 * browser automation framework for this would be exactly the
 * "unnecessary testing framework" the audit asked me to avoid.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./tests/setup/env.ts"],
    // Integration tests hit a real Postgres DB — sequential per file to
    // avoid one file's resetDb() truncating tables mid-test in another
    // file running in parallel. Tests *within* a file that intentionally
    // exercise concurrency (e.g. two simultaneous finalize calls) do so
    // explicitly via Promise.all against their own isolated rows.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      // Mirrors tsconfig.json's "@/*": ["src/*"] — Vitest doesn't read
      // tsconfig paths itself unless a plugin is added, and adding a
      // plugin for this alone would be an unnecessary dependency for
      // one line of resolution logic.
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
