import { createHash } from "node:crypto";

/**
 * Deterministically hashes a string into a signed 64-bit integer suitable
 * for `pg_advisory_xact_lock(bigint)`. Same input always yields the same
 * key, so concurrent requests for the same logical resource serialize on
 * the same lock without needing a shared counter or extra table.
 */
export function toAdvisoryLockKey(input: string): bigint {
  const digest = createHash("sha256").update(input).digest();
  const unsigned = digest.readBigUInt64BE(0);
  // pg_advisory_xact_lock takes a signed bigint; wrap into that range.
  return BigInt.asIntN(64, unsigned);
}
