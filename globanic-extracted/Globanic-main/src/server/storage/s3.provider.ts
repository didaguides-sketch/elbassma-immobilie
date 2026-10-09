import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageProvider, UploadInput, UploadResult } from "./storage.interface";

/**
 * S3-compatible provider. Works unmodified against:
 *  - AWS S3            (S3_ENDPOINT unset)
 *  - Cloudflare R2      (S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com)
 *  - Supabase Storage    (S3_ENDPOINT=https://<project>.supabase.co/storage/v1/s3)
 *  - MinIO (self-hosted) (S3_ENDPOINT=http://localhost:9000)
 *
 * Credentials are read from process.env only, at construction time — they
 * never reach the client bundle since this class is only ever instantiated
 * inside `src/server/**`.
 */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;

  constructor() {
    const region = requireEnv("S3_REGION");
    const bucket = requireEnv("S3_BUCKET");
    const accessKeyId = requireEnv("S3_ACCESS_KEY_ID");
    const secretAccessKey = requireEnv("S3_SECRET_ACCESS_KEY");
    const endpoint = process.env.S3_ENDPOINT || undefined;

    this.bucket = bucket;
    this.publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

    this.client = new S3Client({
      region,
      endpoint,
      // R2/MinIO/Supabase all need path-style addressing; AWS S3 works
      // with either, so this is safe to force on unconditionally.
      forcePathStyle: !!endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async upload({ key, body, mimeType }: UploadInput): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
        // Private by default — access only via getSignedDownloadUrl(),
        // never a public ACL, since resources are gated by moderation
        // status until PUBLISHED.
      }),
    );

    return {
      storageKey: key,
      fileUrl: await this.getSignedDownloadUrl(key),
    };
  }

  async getSignedDownloadUrl(storageKey: string, expiresInSeconds = 3600): Promise<string> {
    if (this.publicBaseUrl) {
      // Optional: if the bucket is fronted by a public CDN (e.g. published
      // resources only), skip signing entirely for lower latency.
      return `${this.publicBaseUrl.replace(/\/$/, "")}/${storageKey}`;
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}" for the S3 storage provider. ` +
        `Set it in .env (see .env.example) before starting the app with STORAGE_PROVIDER=s3.`,
    );
  }
  return value;
}
