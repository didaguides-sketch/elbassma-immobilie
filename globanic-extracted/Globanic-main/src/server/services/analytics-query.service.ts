import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { can, requireRole, ForbiddenError, type Role } from "@/server/auth/rbac";
import { NotFoundError } from "./resource.service";

type Actor = { id: string; role: Role };

// ------------------------------------------------------------
// PUBLISHER TOTALS
// ------------------------------------------------------------

export async function getPublisherTotals(actor: Actor) {
  requireRole(actor.role, ["PUBLISHER", "ADMIN", "SUPER_ADMIN"]);

  const [totals, statusCounts] = await Promise.all([
    prisma.resource.aggregate({
      where: { uploadedById: actor.id },
      _sum: { viewsCount: true, downloadsCount: true, bookmarksCount: true },
      _count: { _all: true },
    }),
    prisma.resource.groupBy({
      by: ["status"],
      where: { uploadedById: actor.id },
      _count: { _all: true },
    }),
  ]);

  return {
    totalResources: totals._count._all,
    totalViews: totals._sum.viewsCount ?? 0,
    totalDownloads: totals._sum.downloadsCount ?? 0,
    totalBookmarks: totals._sum.bookmarksCount ?? 0,
    byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all])),
  };
}

// ------------------------------------------------------------
// PER-RESOURCE STATS
// ------------------------------------------------------------

export async function getResourceAnalyticsSummary(actor: Actor, resourceId: string) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new NotFoundError();

  const isOwner = resource.uploadedById === actor.id;
  if (!isOwner && !can(actor.role, "resource:view-any")) {
    throw new ForbiddenError();
  }

  const [rawViews, eligibleViews, rawDownloads, eligibleDownloads] = await Promise.all([
    prisma.resourceView.count({ where: { resourceId } }),
    prisma.resourceView.count({ where: { resourceId, isEligible: true } }),
    prisma.resourceDownload.count({ where: { resourceId } }),
    prisma.resourceDownload.count({ where: { resourceId, isEligible: true } }),
  ]);

  return {
    viewsCount: resource.viewsCount,
    downloadsCount: resource.downloadsCount,
    bookmarksCount: resource.bookmarksCount,
    // Transparency breakdown — useful for a publisher to understand why
    // their eligible count is lower than raw traffic (self-views excluded,
    // duplicates within the same session, bot hits, etc).
    rawViews,
    eligibleViews,
    rawDownloads,
    eligibleDownloads,
  };
}

// ------------------------------------------------------------
// TIME-SERIES (daily / weekly / monthly)
// ------------------------------------------------------------

export type SeriesBucket = "day" | "week" | "month";
export type SeriesPoint = { date: string; views: number; downloads: number };

async function resolveResourceIdsForSeries(actor: Actor, resourceId?: string): Promise<string[]> {
  if (resourceId) {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundError();
    const isOwner = resource.uploadedById === actor.id;
    if (!isOwner && !can(actor.role, "resource:view-any")) throw new ForbiddenError();
    return [resourceId];
  }

  requireRole(actor.role, ["PUBLISHER", "ADMIN", "SUPER_ADMIN"]);
  const resources = await prisma.resource.findMany({
    where: { uploadedById: actor.id },
    select: { id: true },
  });
  return resources.map((r) => r.id);
}

/**
 * Real day/week/month aggregation via DATE_TRUNC — Prisma's query builder
 * can't express arbitrary time bucketing, so this uses `$queryRaw` with
 * fully parameterized values (Prisma.sql / Prisma.join), never string
 * interpolation of user input.
 */
export async function getResourceEventSeries(
  actor: Actor,
  options: { resourceId?: string; bucket: SeriesBucket; days: number },
): Promise<SeriesPoint[]> {
  const resourceIds = await resolveResourceIdsForSeries(actor, options.resourceId);
  if (resourceIds.length === 0) return [];

  const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);
  const idsList = Prisma.join(resourceIds);

  const [viewRows, downloadRows] = await Promise.all([
    prisma.$queryRaw<{ bucket: Date; count: bigint }[]>(Prisma.sql`
      SELECT DATE_TRUNC(${options.bucket}, "createdAt") AS bucket, COUNT(*)::bigint AS count
      FROM "ResourceView"
      WHERE "resourceId" IN (${idsList})
        AND "createdAt" >= ${since}
        AND "isEligible" = true
      GROUP BY bucket
      ORDER BY bucket ASC
    `),
    prisma.$queryRaw<{ bucket: Date; count: bigint }[]>(Prisma.sql`
      SELECT DATE_TRUNC(${options.bucket}, "createdAt") AS bucket, COUNT(*)::bigint AS count
      FROM "ResourceDownload"
      WHERE "resourceId" IN (${idsList})
        AND "createdAt" >= ${since}
        AND "isEligible" = true
      GROUP BY bucket
      ORDER BY bucket ASC
    `),
  ]);

  const byDate = new Map<string, SeriesPoint>();

  for (const row of viewRows) {
    const key = row.bucket.toISOString();
    const point = byDate.get(key) ?? { date: key, views: 0, downloads: 0 };
    point.views = Number(row.count);
    byDate.set(key, point);
  }
  for (const row of downloadRows) {
    const key = row.bucket.toISOString();
    const point = byDate.get(key) ?? { date: key, views: 0, downloads: 0 };
    point.downloads = Number(row.count);
    byDate.set(key, point);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
