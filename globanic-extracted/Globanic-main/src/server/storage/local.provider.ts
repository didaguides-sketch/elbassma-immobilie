import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { StorageProvider, UploadInput, UploadResult } from "./storage.interface";

/**
 * DEVELOPMENT-ONLY provider. Writes files to a local directory on disk.
 *
 * This is intentionally simple and NOT production-appropriate:
 *  - No redundancy: a container restart on most PaaS platforms (Vercel,
 *    Render, Fly ephemeral disks, etc.) wipes this directory.
 *  - Does not work across multiple server instances (each has its own disk).
 *  - Serves files back through `/api/files/[...key]` (see that route),
 *    which has no access control beyond what's implemented there — fine
 *    for a local dev loop, not for real user data.
 *
 * Set STORAGE_PROVIDER=s3 (see s3.provider.ts) before deploying anywhere
 * that matters. See README.md "Production storage configuration".
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly rootDir: string;

  constructor(rootDir = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), ".local-storage")) {
    this.rootDir = rootDir;
  }

  private resolveSafePath(storageKey: string): string {
    // Reject path traversal / absolute paths — storageKey must stay inside rootDir.
    const normalized = path.normalize(storageKey).replace(/^(\.\.[/\\])+/, "");
    if (normalized.includes("..")) {
      throw new Error(`Unsafe storage key: ${storageKey}`);
    }
    return path.join(this.rootDir, normalized);
  }

  async upload({ key, body }: UploadInput): Promise<UploadResult> {
    const filePath = this.resolveSafePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body);

    return {
      storageKey: key,
      fileUrl: await this.getSignedDownloadUrl(key),
    };
  }

  async getSignedDownloadUrl(storageKey: string): Promise<string> {
    // No real signing locally — the dev route handler is the "auth".
    return `/api/files/${storageKey}`;
  }

  async delete(storageKey: string): Promise<void> {
    const filePath = this.resolveSafePath(storageKey);
    if (existsSync(filePath)) {
      await rm(filePath, { force: true });
    }
  }

  /** Used only by the local dev route handler — not part of StorageProvider. */
  async readFile(storageKey: string): Promise<Buffer> {
    return readFile(this.resolveSafePath(storageKey));
  }
}
