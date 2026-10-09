/**
 * Provider-agnostic file storage contract.
 *
 * Nothing outside `src/server/storage/` is allowed to import an SDK
 * (aws-sdk, @supabase/storage-js, etc.) directly. Services call this
 * interface only, so swapping providers in production means writing one
 * new file here and flipping `STORAGE_PROVIDER` — zero changes anywhere
 * else in the app (resource.service.ts, Server Actions, UI).
 */
export interface UploadInput {
  /** Full storage key/path, e.g. "resources/abc123/9f2c...-thesis.pdf" */
  key: string;
  body: Buffer;
  mimeType: string;
}

export interface UploadResult {
  storageKey: string;
  /**
   * Where the file can currently be fetched from. For providers that only
   * serve via short-lived signed URLs, this is a signed URL valid at
   * upload time — callers that need a fresh link later must call
   * `getSignedDownloadUrl(storageKey)` again rather than caching this.
   */
  fileUrl: string;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;

  /** Returns a (possibly time-limited) URL to read the object. */
  getSignedDownloadUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;

  /** Permanently removes the object. Safe to call on a missing key (no-op). */
  delete(storageKey: string): Promise<void>;
}

export class StorageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageValidationError";
  }
}
