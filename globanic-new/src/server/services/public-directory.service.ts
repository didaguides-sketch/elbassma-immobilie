import { prisma } from "@/lib/prisma";
import { PUBLIC_RESOURCE_CARD_SELECT } from "./public-resource.service";

// ------------------------------------------------------------
// UNIVERSITIES
// ------------------------------------------------------------

export async function listUniversities(params: { take?: number; skip?: number }) {
  const { take = 20, skip = 0 } = params;

  const rows = await prisma.university.findMany({
    orderBy: { name: "asc" },
    take: take + 1,
    skip,
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      country: true,
      logoUrl: true,
      // Direct FK relation (Resource.universityId) — a plain `where` on
      // the related model's own field, the well-supported `_count` case.
      _count: { select: { resources: { where: { status: "PUBLISHED" } } } },
    },
  });

  const hasMore = rows.length > take;
  return { universities: hasMore ? rows.slice(0, take) : rows, hasMore };
}

/**
 * Homepage-only, deliberately NOT built on top of listUniversities():
 * "top N by resource count" cannot be correctly expressed as a
 * name-ordered paginated page re-sorted afterward (the true top N might
 * not even be within whichever page got fetched). Prisma also can't
 * order by a *filtered* relation count directly in `orderBy` — only an
 * unfiltered `_count` aggregate is supported there. So this fetches a
 * bounded batch (capped, not the full unbounded table) with the same
 * filtered count shape, and sorts in JS — correct, and cheap at any
 * realistic university-catalog size.
 */
export async function listTopUniversitiesByResourceCount(limit: number) {
  const BATCH_CAP = 200;

  const rows = await prisma.university.findMany({
    take: BATCH_CAP,
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      country: true,
      logoUrl: true,
      _count: { select: { resources: { where: { status: "PUBLISHED" } } } },
    },
  });

  return [...rows]
    .sort((a, b) => b._count.resources - a._count.resources)
    .slice(0, limit);
}

export async function getUniversityBySlug(slug: string) {
  return prisma.university.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      country: true,
      logoUrl: true,
      officialWebsite: true,
      _count: {
        select: {
          resources: { where: { status: "PUBLISHED" } },
          authors: true,
        },
      },
    },
  });
}

// ------------------------------------------------------------
// AUTHORS
// ------------------------------------------------------------

export async function listAuthors(params: { take?: number; skip?: number }) {
  const { take = 20, skip = 0 } = params;

  const rows = await prisma.author.findMany({
    orderBy: { fullName: "asc" },
    take: take + 1,
    skip,
    select: {
      id: true,
      slug: true,
      fullName: true,
      avatarUrl: true,
      verified: true,
      university: { select: { name: true, slug: true } },
      // Author -> Resource is many-to-many through ResourceAuthor, so this
      // is a relation-of-a-relation for `status`. Rather than rely on
      // nested-relation filtering inside `_count` (unverified against a
      // real Prisma client in this environment), fetch the join rows we
      // need and count them in JS — unambiguous, guaranteed-correct
      // relation filtering, same pattern already proven elsewhere in this
      // codebase (e.g. Phase 8's `domain: { slug }` resource filter).
      resources: {
        where: { resource: { status: "PUBLISHED" } },
        select: { resourceId: true },
      },
    },
  });

  const hasMore = rows.length > take;
  const authors = (hasMore ? rows.slice(0, take) : rows).map(({ resources, ...rest }) => ({
    ...rest,
    publishedResourceCount: resources.length,
  }));

  return { authors, hasMore };
}

export async function getAuthorBySlug(slug: string) {
  const author = await prisma.author.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      fullName: true,
      bio: true,
      avatarUrl: true,
      verified: true,
      university: { select: { name: true, slug: true } },
      resources: {
        where: { resource: { status: "PUBLISHED" } },
        select: { resourceId: true },
      },
    },
  });

  if (!author) return null;

  const { resources, ...rest } = author;
  return { ...rest, publishedResourceCount: resources.length };
}

export async function listPublishedResourcesByAuthor(
  authorId: string,
  params: { take?: number; skip?: number },
) {
  const { take = 20, skip = 0 } = params;

  const rows = await prisma.resource.findMany({
    where: { status: "PUBLISHED", authors: { some: { authorId } } },
    orderBy: { publishedAt: "desc" },
    take: take + 1,
    skip,
    select: PUBLIC_RESOURCE_CARD_SELECT,
  });

  const hasMore = rows.length > take;
  return { resources: hasMore ? rows.slice(0, take) : rows, hasMore };
}

// ------------------------------------------------------------
// DOMAINS
// ------------------------------------------------------------

export async function getDomainBySlug(slug: string) {
  return prisma.domain.findUnique({
    where: { slug },
    include: {
      specialties: { orderBy: { order: "asc" } },
      _count: { select: { resources: { where: { status: "PUBLISHED" } } } },
    },
  });
}

/**
 * Homepage-only. The existing /domains listing (Phase 9) deliberately
 * reuses listDomainsWithSpecialties() with no resource-count query, by
 * design, to avoid an extra query on that page. The homepage mockup
 * explicitly shows a count per domain card, so this is a small, separate,
 * additive query — it does not change /domains' behavior at all.
 */
export async function listDomainsWithResourceCounts() {
  return prisma.domain.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      _count: { select: { resources: { where: { status: "PUBLISHED" } } } },
    },
  });
}
