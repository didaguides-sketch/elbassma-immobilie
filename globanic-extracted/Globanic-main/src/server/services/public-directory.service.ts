import { prisma } from "@/lib/prisma";
import { PUBLIC_RESOURCE_CARD_SELECT } from "./public-resource.service";

// ------------------------------------------------------------
// UNIVERSITIES
// ------------------------------------------------------------

export async function listUniversities(params: { take?: number; skip?: number; q?: string }) {
  const { take = 20, skip = 0, q } = params;
  const nameFilter = q?.trim() ? { name: { contains: q.trim(), mode: "insensitive" as const } } : {};

  const rows = await prisma.university.findMany({
    where: nameFilter,
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
      // Real Faculty rows for this university, each with its own real
      // published-resource count — no fabricated "N faculties" number,
      // and an empty array renders as "no faculties yet" rather than a
      // hidden/fake section (see Phase 6 report).
      faculties: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { resources: { where: { status: "PUBLISHED" } } } },
        },
      },
    },
  });
}

/**
 * Faculty has no slug field (see Phase 6 audit) — id is the route
 * segment. Includes the parent University's slug/name for the
 * breadcrumb, since a Faculty page is only ever reached in that
 * context, never standalone.
 */
/**
 * Minimal PUBLIC publisher identity — Phase 8 audit finding:
 * PublisherProfile has NO public-facing fields (no bio, no logo, no
 * organization name — only academicStatus/university/payout-related
 * fields, none of them intended for public display). The only genuine
 * public identity available is the linked Profile.fullName (already
 * used this way on the resource detail page since Phase 5) plus the
 * real verification signal (PublisherProfile.verifiedAt — distinct
 * from, and never conflated with, Author.verified).
 *
 * Selects ONLY: display name, verification timestamp, published-
 * resource count. Explicitly does NOT select academicStatus, university/
 * specialty affiliation, academicEmail, payoutSharePercentage, or any
 * payout-account/financial field — none of that is public information.
 *
 * `role: "PUBLISHER"` in the where clause ensures this can only ever
 * resolve a real publisher account, never an arbitrary user id.
 */
export async function getPublicPublisherById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, role: "PUBLISHER" },
    select: {
      id: true,
      profile: { select: { fullName: true } },
      publisherProfile: { select: { verifiedAt: true } },
      _count: { select: { resourcesUploaded: { where: { status: "PUBLISHED" } } } },
    },
  });
  if (!user || !user.publisherProfile) return null;
  return {
    id: user.id,
    displayName: user.profile?.fullName ?? null,
    verified: !!user.publisherProfile.verifiedAt,
    publishedResourceCount: user._count.resourcesUploaded,
  };
}

/**
 * Faculty has no slug field (see Phase 6 audit) — id is the route
 * segment. Includes the parent University's slug/name for the
 * breadcrumb, since a Faculty page is only ever reached in that
 * context, never standalone.
 */
export async function getFacultyById(id: string) {
  return prisma.faculty.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      university: { select: { id: true, slug: true, name: true } },
      _count: { select: { resources: { where: { status: "PUBLISHED" } } } },
    },
  });
}

// ------------------------------------------------------------
// AUTHORS
// ------------------------------------------------------------

export async function listAuthors(params: { take?: number; skip?: number; q?: string }) {
  const { take = 20, skip = 0, q } = params;
  const nameFilter = q?.trim() ? { fullName: { contains: q.trim(), mode: "insensitive" as const } } : {};

  const rows = await prisma.author.findMany({
    where: nameFilter,
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
      specialties: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          _count: { select: { resources: { where: { status: "PUBLISHED" } } } },
        },
      },
      _count: { select: { resources: { where: { status: "PUBLISHED" } } } },
    },
  });
}

/**
 * There is no direct University<->Domain relationship in the schema
 * (University has no domainId/domains field) — this is DERIVED: any
 * university that has at least one published resource in this domain.
 * That distinction matters and must stay visible in the UI copy (see
 * the domain page: "جامعات لها موارد في هذا المجال", not "جامعات
 * المجال"), so a derived aggregation is never presented as an
 * institutional relationship the database doesn't actually assert.
 * One query, no N+1 — `some` on the relation, not a per-university loop.
 */
export async function listUniversitiesWithResourcesInDomain(domainId: string, take = 8) {
  return prisma.university.findMany({
    where: { resources: { some: { domainId, status: "PUBLISHED" } } },
    orderBy: { name: "asc" },
    take,
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      country: true,
      _count: { select: { resources: { where: { status: "PUBLISHED", domainId } } } },
    },
  });
}

/**
 * Same principle as above — Author has no domainId either. Derived via
 * "has authored at least one published resource in this domain."
 */
export async function listAuthorsWithResourcesInDomain(domainId: string, take = 8) {
  return prisma.author.findMany({
    where: { resources: { some: { resource: { domainId, status: "PUBLISHED" } } } },
    orderBy: { fullName: "asc" },
    take,
    select: { id: true, slug: true, fullName: true, verified: true },
  });
}

/**
 * Used by both the homepage and /domains (as of Phase 7 — the domains
 * directory previously used listDomainsWithSpecialties() with no
 * resource-count query; it now shows real counts too, so this is no
 * longer homepage-only).
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
