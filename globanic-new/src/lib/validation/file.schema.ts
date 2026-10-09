import { StorageValidationError } from "@/server/storage/storage.interface";

export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_COVER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_PROOF_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const DOCUMENT_MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
};

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Publisher-application proof: a scanned ID/certificate, so either a PDF
// or a photo is legitimate — union of the two maps above.
const PROOF_MIME_TO_EXT: Record<string, string> = {
  ...DOCUMENT_MIME_TO_EXT,
  ...IMAGE_MIME_TO_EXT,
};

/**
 * Checks the first bytes of the buffer against known file signatures.
 * A client can lie about `file.type` (or an attacker can rename a
 * malicious file to `.pdf`) — this is the actual server-side check that
 * the bytes are what they claim to be.
 */
function sniffMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function assertFile(
  file: File,
  buffer: Buffer,
  allowedMimeToExt: Record<string, string>,
  maxSizeBytes: number,
  kindLabel: string,
) {
  if (file.size === 0) {
    throw new StorageValidationError(`الملف فارغ.`);
  }

  if (file.size > maxSizeBytes) {
    throw new StorageValidationError(
      `حجم ${kindLabel} يتجاوز الحد المسموح به (${Math.round(maxSizeBytes / (1024 * 1024))}MB).`,
    );
  }

  const claimedExt = file.name.split(".").pop()?.toLowerCase();
  const expectedExtForClaimedMime = allowedMimeToExt[file.type];

  if (!expectedExtForClaimedMime) {
    throw new StorageValidationError(
      `نوع ${kindLabel} غير مدعوم (${file.type || "غير معروف"}).`,
    );
  }

  if (claimedExt !== expectedExtForClaimedMime) {
    throw new StorageValidationError(`امتداد الملف لا يطابق نوعه المُعلن.`);
  }

  // The real check: sniff actual bytes, ignore what the client claims.
  const sniffed = sniffMimeType(buffer);
  if (!sniffed || !(sniffed in allowedMimeToExt)) {
    throw new StorageValidationError(
      `محتوى الملف لا يطابق ${kindLabel} صالحًا — تم رفضه لأسباب أمنية.`,
    );
  }

  return { verifiedMimeType: sniffed, extension: allowedMimeToExt[sniffed] };
}

export function assertValidResourceDocument(file: File, buffer: Buffer) {
  return assertFile(file, buffer, DOCUMENT_MIME_TO_EXT, MAX_DOCUMENT_SIZE_BYTES, "ملف PDF");
}

export function assertValidCoverImage(file: File, buffer: Buffer) {
  return assertFile(file, buffer, IMAGE_MIME_TO_EXT, MAX_COVER_IMAGE_SIZE_BYTES, "صورة الغلاف");
}

export function assertValidProofDocument(file: File, buffer: Buffer) {
  return assertFile(file, buffer, PROOF_MIME_TO_EXT, MAX_PROOF_DOCUMENT_SIZE_BYTES, "مستند الإثبات");
}
