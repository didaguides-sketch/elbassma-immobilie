import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/utils/site-url";

/**
 * Canonical strategy for paginated/filtered public listings (the specific
 * requirement this phase had to get right):
 *
 *  - Every page's canonical URL is ITSELF — page 2 is never canonicalized
 *    to page 1. Google deprecated rel=prev/next in 2019; the current
 *    guidance is a self-referencing canonical on every page in a series,
 *    which is what this does uniformly.
 *  - The canonical reflects only the searchParams keys that are actually
 *    part of that page's *identity* (`allowedParams`) — e.g. `page` and
 *    `domain` for /resources, but never an incidental/unrelated param —
 *    so two different filter combinations never collapse onto the same
 *    canonical URL, and a stray param never gets baked into it either.
 *  - `page=1` (or no page param at all) canonicalizes to the bare path
 *    with no `?page=1` — that bare path is exactly what appears in
 *    sitemap.ts. Pages 2+ are deliberately NOT enumerated in the sitemap
 *    (standard practice — they're discovered via the on-page pagination
 *    links, same as any crawler would), which is why their canonical
 *    self-reference doesn't create a sitemap/canonical contradiction.
 *  - `noindex` is opt-in per call site (used only for /search — a
 *    query-driven results page, not a structured browse listing) and is
 *    never inferred from the presence of pagination alone.
 */
export function buildPageMetadata(options: {
  title?: string;
  description: string;
  path: string;
  searchParams?: Record<string, string | undefined>;
  allowedParams?: string[];
  noindex?: boolean;
}): Metadata {
  const { title, description, path, searchParams = {}, allowedParams = [], noindex = false } = options;

  const query = new URLSearchParams();
  for (const key of allowedParams) {
    const value = searchParams[key];
    if (value) query.set(key, value);
  }
  const queryString = query.toString();
  const canonicalPath = queryString ? `${path}?${queryString}` : path;
  const url = absoluteUrl(canonicalPath);

  return {
    // Omitting `title` entirely (rather than setting it to something
    // generic) lets Next.js's metadata inheritance fall through to the
    // root layout's branded `default` title — used by the homepage,
    // which shouldn't get a title template applied to it.
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url },
    openGraph: {
      ...(title ? { title } : {}),
      description,
      url,
      type: "website",
      siteName: "Globanic",
    },
    twitter: {
      card: "summary",
      ...(title ? { title } : {}),
      description,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
