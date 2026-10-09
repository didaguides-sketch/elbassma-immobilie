const DEFAULT_DEV_URL = "http://localhost:3000";

/**
 * Reads NEXT_PUBLIC_SITE_URL, falling back to localhost in dev so nothing
 * breaks if it's unset. Set the real production domain in .env for
 * correct canonical/Open Graph/sitemap URLs — see .env.example.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_DEV_URL;
  return url.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
