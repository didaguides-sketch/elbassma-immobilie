import { prisma } from "@/lib/prisma";
import { Prisma, type ResourceType } from "@prisma/client";

/**
 * The exact field shape `ResourceCard` (Phase 8) expects. Exported so
 * every public listing query — this file's, and
 * public-directory.service.ts's author-resources query — selects
 * identically without copy-pasting the field list.
 */
export const PUBLIC_RESOURCE_CARD_SELECT = {
  id: true,
  title: true,
  slug: true,
  type: true,
  level: true,
  year: true,
  viewsCount: true,
  downloadsCount: true,
  publishedAt: true,
  university: { select: { name: true, slug: true } },
  authors: { include: { author: { select: { fullName: true, slug: true } } } },
} as const;

/**
 * Foundation for the future /resources/[type]/[slug] page. Deliberately
 * narrow: only PUBLISHED resources are ever returned here — DRAFT/
 * SUBMITTED/UNDER_REVIEW/REJECTED/CHANGES_REQUESTED/UNPUBLISHED resources
 * must never leak through the public read path, regardless of caller.
 */
export async function getPublishedResourceBySlug(type: ResourceType, slug: string) {
  return prisma.resource.findFirst({
    where: { type, slug, status: "PUBLISHED" },
    include: {
      domain: true,
      specialty: true,
      university: true,
      faculty: true,
      authors: { include: { author: true }, orderBy: { order: "asc" } },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { file: true },
      },
      // Publisher identity (section 17: "who published this resource" is
      // public trust information — financial/payout data is a separate,
      // unrelated model and is never touched by this query).
      uploadedBy: { select: { id: true, profile: { select: { fullName: true } } } },
    },
  });
}

/**
 * Real, deterministic related resources — no recommendation engine, no
 * AI, no randomness. Priority order: same academic domain first (the
 * strongest real signal Globanic has for topical relevance), then same
 * university, excluding the resource itself, published only. Capped
 * small (Phase 5 asks for "restrained").
 */
/**
 * Real, deterministic related resources — no recommendation engine, no
 * AI, no randomness. Tiered by priority (domain > specialty > university
 * > author), each tier queried only if the previous ones haven't
 * already filled `take` — this is a genuine priority order, not the
 * single-OR-with-recency approximation this function used before Phase
 * 9 (which couldn't actually express "prefer domain over university").
 * A handful of small, indexed, bounded queries — not a hot-path
 * function, called once per resource-detail page render.
 */
export async function listRelatedResources(
  resource: {
    id: string;
    domainId: string | null;
    specialtyId: string | null;
    universityId: string | null;
  },
  options: { authorIds?: string[]; type?: ResourceType; take?: number } = {},
) {
  const take = options.take ?? 4;
  const seen = new Set<string>([resource.id]);
  const results: Prisma.ResourceGetPayload<{ select: typeof PUBLIC_RESOURCE_CARD_SELECT }>[] = [];

  async function addTier(where: Prisma.ResourceWhereInput) {
    if (results.length >= take) return;
    const rows = await prisma.resource.findMany({
      where: { status: "PUBLISHED", type: options.type, id: { notIn: [...seen] }, ...where },
      orderBy: { publishedAt: "desc" },
      take: take - results.length,
      select: PUBLIC_RESOURCE_CARD_SELECT,
    });
    for (const row of rows) {
      seen.add(row.id);
      results.push(row);
    }
  }

  if (resource.domainId) await addTier({ domainId: resource.domainId });
  if (resource.specialtyId) await addTier({ specialtyId: resource.specialtyId });
  if (resource.universityId) await addTier({ universityId: resource.universityId });
  if (options.authorIds && options.authorIds.length > 0) {
    await addTier({ authors: { some: { authorId: { in: options.authorIds } } } });
  }

  return results;
}

/** Same tiered logic, scoped to ARTICLE resources only — used on the
 * article detail page's "مقالات ذات صلة" section (Phase 9), kept
 * separate from the generic related-resources call so a non-article
 * detail page's behavior is completely unchanged. */
export async function listRelatedArticles(resource: {
  id: string;
  domainId: string | null;
  specialtyId: string | null;
  universityId: string | null;
}, authorIds: string[] = []) {
  return listRelatedResources(resource, { authorIds, type: "ARTICLE", take: 3 });
}

export type PublishedResourcesSort = "recent" | "most_viewed" | "most_downloaded";

const SORT_ORDER_BY: Record<PublishedResourcesSort, { [key: string]: "asc" | "desc" }> = {
  recent: { publishedAt: "desc" },
  most_viewed: { viewsCount: "desc" },
  most_downloaded: { downloadsCount: "desc" },
};

export async function listPublishedResources(params: {
  type?: ResourceType;
  domainSlug?: string;
  specialtySlug?: string;
  universityId?: string;
  facultyId?: string;
  uploadedById?: string;
  authorSlug?: string;
  language?: string;
  take?: number;
  skip?: number;
  /** Defaults to "recent" — the exact behavior every existing caller
   * (resources listings, university/domain detail pages) already relies
   * on. Only the homepage passes "most_viewed"/"most_downloaded". */
  sort?: PublishedResourcesSort;
}) {
  const { type, domainSlug, specialtySlug, universityId, facultyId, uploadedById, authorSlug, language, take = 20, skip = 0, sort = "recent" } = params;

  // Fetch one extra row beyond the requested page size to detect whether
  // a next page exists, without a separate COUNT(*) query.
  const rows = await prisma.resource.findMany({
    where: {
      status: "PUBLISHED",
      type,
      domain: domainSlug ? { slug: domainSlug } : undefined,
      specialty: specialtySlug ? { slug: specialtySlug } : undefined,
      universityId: universityId ?? undefined,
      facultyId: facultyId ?? undefined,
      uploadedById: uploadedById ?? undefined,
      authors: authorSlug ? { some: { author: { slug: authorSlug } } } : undefined,
      language: language ?? undefined,
    },
    orderBy: SORT_ORDER_BY[sort],
    take: take + 1,
    skip,
    select: PUBLIC_RESOURCE_CARD_SELECT,
  });

  const hasMore = rows.length > take;
  return { resources: hasMore ? rows.slice(0, take) : rows, hasMore };
}
