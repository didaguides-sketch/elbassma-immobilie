/**
 * Validates that a string is safe to use as a post-login/post-action
 * redirect target: a same-origin relative path only. Rejects:
 *  - anything not starting with a single "/"          ("https://evil.com", "evil.com")
 *  - protocol-relative URLs                             ("//evil.com")
 *  - backslash tricks some browsers normalize to "//"   ("/\evil.com", "/\/evil.com")
 *  - an embedded scheme                                 ("javascript:alert(1)")
 *
 * This is a pragmatic guard against open-redirect abuse, not a
 * general-purpose URL parser — callers should always have a safe
 * fallback ready for when this returns false.
 */
export function isSafeRelativePath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (path.length === 0) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  if (path.toLowerCase().includes("javascript:")) return false;
  // Reject an embedded scheme immediately following stripped leading
  // slashes/whitespace, e.g. "/\thttps://evil.com" style tricks. A normal
  // path's own query string (e.g. "/redirect?to=https://evil.com") is
  // untouched by this check since the scheme there isn't at the start.
  if (/^\/+\s*[a-z][a-z0-9+.-]*:/i.test(path)) return false;
  return true;
}
