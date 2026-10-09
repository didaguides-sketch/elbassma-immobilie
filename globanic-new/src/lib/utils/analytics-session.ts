import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const COOKIE_NAME = "gnc_sid";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

/**
 * Reads the anonymous analytics session id from cookies, creating one if
 * absent. This is NOT the Auth.js session — it identifies a browser for
 * view-dedup purposes only, works for logged-out visitors, and carries no
 * personal information (a random id, nothing else).
 *
 * Must be called from a Route Handler or Server Action (both can write
 * cookies) — a plain Server Component render cannot set cookies. This is
 * exactly the boundary Phase 9's public resource page will need to
 * respect when it calls recordResourceView().
 */
export function getOrCreateAnalyticsSessionId(): string {
  const store = cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const sessionId = randomUUID();
  store.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
  return sessionId;
}
