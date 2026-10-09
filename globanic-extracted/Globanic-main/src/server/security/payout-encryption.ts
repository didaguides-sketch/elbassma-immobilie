import crypto from "node:crypto";

/**
 * Encryption for PublisherPayoutAccount.encryptedDetails.
 *
 * This is the ONLY module allowed to see plaintext CCP numbers, CCP
 * keys, or RIP values. Every other file (services, actions, UI) must go
 * through encryptPayoutDetails/decryptPayoutDetails — never inline
 * crypto calls elsewhere, and never log the plaintext object anywhere
 * (no console.log of a decrypted payload, ever).
 *
 * Algorithm: AES-256-GCM. Authenticated encryption is required here, not
 * optional — GCM's auth tag means a tampered ciphertext (e.g. a
 * corrupted DB row, or someone flipping bytes to try to forge a
 * different account number) fails to decrypt loudly instead of
 * producing silently-wrong plaintext.
 *
 * Storage format (single base64 string): [12-byte IV][16-byte auth tag][ciphertext]
 *
 * KEY ROTATION: PublisherPayoutAccount.encryptionKeyVersion records which
 * key encrypted a given row. To rotate PAYOUT_ENCRYPTION_KEY:
 *   1. Add the new key as PAYOUT_ENCRYPTION_KEY, move the old value to
 *      PAYOUT_ENCRYPTION_KEY_PREVIOUS, bump CURRENT_KEY_VERSION below.
 *   2. Old rows (lower keyVersion) still decrypt via the previous key.
 *   3. Re-encrypt rows opportunistically (e.g. on next publisher update)
 *      to migrate them to the new version.
 */

const CURRENT_KEY_VERSION = 1;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function loadKey(envVarName: string): Buffer {
  const raw = process.env[envVarName];
  if (!raw) {
    throw new Error(
      `${envVarName} is not set. Refusing to encrypt/decrypt payout account ` +
        `data without a real key — generate one with: openssl rand -base64 32`,
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `${envVarName} must decode to exactly 32 bytes for AES-256 (got ${key.length}). ` +
        `Generate one with: openssl rand -base64 32`,
    );
  }
  return key;
}

function keyForVersion(version: number): Buffer {
  if (version === CURRENT_KEY_VERSION) {
    return loadKey("PAYOUT_ENCRYPTION_KEY");
  }
  // Only reached during a rotation window — see module docblock.
  return loadKey("PAYOUT_ENCRYPTION_KEY_PREVIOUS");
}

export function encryptPayoutDetails(details: Record<string, unknown>): {
  encryptedDetails: string;
  encryptionKeyVersion: number;
} {
  const key = keyForVersion(CURRENT_KEY_VERSION);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = Buffer.from(JSON.stringify(details), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, authTag, ciphertext]);
  return {
    encryptedDetails: payload.toString("base64"),
    encryptionKeyVersion: CURRENT_KEY_VERSION,
  };
}

export function decryptPayoutDetails<T = Record<string, unknown>>(
  encryptedDetails: string,
  encryptionKeyVersion: number,
): T {
  const key = keyForVersion(encryptionKeyVersion);
  const payload = Buffer.from(encryptedDetails, "base64");

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

/** Keeps only the last N characters visible, e.g. maskTail("00799999123456", 4) -> "•••• 3456". */
export function maskTail(value: string, visibleCount = 4): string {
  const digits = value.replace(/\s+/g, "");
  const tail = digits.slice(-visibleCount);
  return `•••• ${tail}`;
}
