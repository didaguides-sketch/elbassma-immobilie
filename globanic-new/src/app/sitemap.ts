import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils/site-url";
import { resourceTypeToUrlSegment } from "@/lib/utils/resource-type";
import { listDomainsWithSpecialties } from "@/server/services/taxonomy.service";

/**
 * Deliberately does NOT enumerate every ?page=N variant of a listing —
 * standard sitemap practice is to list the canonical "index" entry (page
 * 1, no query string) and let pagination links themselves surface deeper
 * pages to a crawler, exactly the way buildPageMetadata's canonical
 * strategy expects (see src/lib/seo/metadata.ts). Enumerating every page
 * number here would also fight the self-referencing-canonical strategy —
 * a sitemap is supposed to list canonical URLs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [resources, universities, authors, domains] = await Promise.all([
    // Only PUBLISHED — same discipline as every public read path in this app.
    prisma.resource.findMany({
      where: { status: "PUBLISHED" },
      select: { type: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    // Direct FK relation (University -> Resource): a plain `where.some`
    // existence filter, the same well-supported pattern used throughout
    // this app for direct relations (e.g. Phase 9's university resource counts).
    prisma.university.findMany({
      where: { resources: { some: { status: "PUBLISHED" } } },
      select: { slug: true, updatedAt: true },
    }),
    // Many-to-many through ResourceAuthor: a plain nested `where.some`
    // filter (not `_count`) — standard, long-supported Prisma relation
    // filtering, distinct from the `_count`-through-a-join uncertainty
    // flagged in Phase 9 (which was specific to `_count`, not `where`).
    prisma.author.findMany({
      where: { resources: { some: { resource: { status: "PUBLISHED" } } } },
      select: { slug: true, updatedAt: true },
    }),
    listDomainsWithSpecialties(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/resources"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/universities"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/authors"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/domains"), changeFrequency: "monthly", priority: 0.6 },
  ];

  const resourceEntries: MetadataRoute.Sitemap = resources.map((r) => ({
    url: absoluteUrl(`/resources/${resourceTypeToUrlSegment(r.type)}/${r.slug}`),
    lastModified: r.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const universityEntries: MetadataRoute.Sitemap = universities.map((u) => ({
    url: absoluteUrl(`/universities/${u.slug}`),
    lastModified: u.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const authorEntries: MetadataRoute.Sitemap = authors.map((a) => ({
    url: absoluteUrl(`/authors/${a.slug}`),
    lastModified: a.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Domain has no `updatedAt` column in the schema — never fabricate a
  // lastModified value for it; omitting the field is the honest choice.
  const domainEntries: MetadataRoute.Sitemap = domains.map((d) => ({
    url: absoluteUrl(`/domains/${d.slug}`),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...resourceEntries, ...universityEntries, ...authorEntries, ...domainEntries];
}
