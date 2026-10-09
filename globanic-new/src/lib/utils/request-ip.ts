import type { NextRequest } from "next/server";
import { sha256Checksum } from "./checksum";

function hashIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const salt = process.env.IP_HASH_SALT ?? "globanic-dev-salt";
  return sha256Checksum(Buffer.from(`${salt}:${ip}`));
}

/**
 * Returns a salted hash of the requester's IP, never the raw IP itself —
 * "do not collect unnecessary personal information". Used only for
 * short-window rate-limiting (ResourceDownload.ipHash), never displayed
 * or exported.
 */
export function getClientIpHash(req: NextRequest): string | undefined {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || undefined;
  return hashIp(ip);
}

/**
 * Same logic, for contexts that only have a header-lookup function rather
 * than a NextRequest — e.g. a Server Action reading `headers()` from
 * `next/headers`. Kept as one implementation (hashIp above) so the two
 * call sites can never drift apart.
 */
export function getClientIpHashFromHeaderGetter(
  getHeader: (name: string) => string | null,
): string | undefined {
  const forwardedFor = getHeader("x-forwarded-for");
  const realIp = getHeader("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || undefined;
  return hashIp(ip ?? undefined);
}
