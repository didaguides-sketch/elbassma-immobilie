import { prisma } from "@/lib/prisma";
import type { ResourceType } from "@prisma/client";

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
    },
  });
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
  universityId?: string;
  take?: number;
  skip?: number;
  /** Defaults to "recent" — the exact behavior every existing caller
   * (resources listings, university/domain detail pages) already relies
   * on. Only the homepage passes "most_viewed"/"most_downloaded". */
  sort?: PublishedResourcesSort;
}) {
  const { type, domainSlug, universityId, take = 20, skip = 0, sort = "recent" } = params;

  // Fetch one extra row beyond the requested page size to detect whether
  // a next page exists, without a separate COUNT(*) query.
  const rows = await prisma.resource.findMany({
    where: {
      status: "PUBLISHED",
      type,
      domain: domainSlug ? { slug: domainSlug } : undefined,
      universityId: universityId ?? undefined,
    },
    orderBy: SORT_ORDER_BY[sort],
    take: take + 1,
    skip,
    select: PUBLIC_RESOURCE_CARD_SELECT,
  });

  const hasMore = rows.length > take;
  return { resources: hasMore ? rows.slice(0, take) : rows, hasMore };
}
