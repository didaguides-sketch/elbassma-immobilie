import type { StorageProvider } from "./storage.interface";
import { LocalStorageProvider } from "./local.provider";

let cachedProvider: StorageProvider | null = null;

/**
 * Returns the active StorageProvider, chosen by STORAGE_PROVIDER.
 *
 *   STORAGE_PROVIDER=local  -> LocalStorageProvider (default; dev only)
 *   STORAGE_PROVIDER=s3     -> S3StorageProvider (AWS S3 / R2 / Supabase / MinIO)
 *
 * The S3 provider is imported dynamically so that `@aws-sdk/*` is never
 * pulled into the dev bundle (or required to even be installed) when
 * running locally with STORAGE_PROVIDER=local.
 */
export async function getStorageProvider(): Promise<StorageProvider> {
  if (cachedProvider) return cachedProvider;

  const providerName = process.env.STORAGE_PROVIDER ?? "local";

  if (providerName === "s3") {
    const { S3StorageProvider } = await import("./s3.provider");
    cachedProvider = new S3StorageProvider();
    return cachedProvider;
  }

  if (providerName === "local") {
    if (process.env.NODE_ENV === "production") {
      // Fail loudly rather than silently writing user files to an
      // ephemeral container disk in production.
      throw new Error(
        'STORAGE_PROVIDER=local is not allowed when NODE_ENV=production. Set STORAGE_PROVIDER=s3 and the S3_* variables (see README.md).',
      );
    }
    cachedProvider = new LocalStorageProvider();
    return cachedProvider;
  }

  throw new Error(`Unknown STORAGE_PROVIDER "${providerName}". Expected "local" or "s3".`);
}

export type { StorageProvider, UploadInput, UploadResult } from "./storage.interface";
export { StorageValidationError } from "./storage.interface";
