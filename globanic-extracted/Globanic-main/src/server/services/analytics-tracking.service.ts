import { prisma } from "@/lib/prisma";
import { isLikelyBot } from "@/lib/utils/bot-detection";
import { toAdvisoryLockKey } from "@/lib/utils/advisory-lock";
import { getActiveAttributionId } from "./referral.service";
import { NotFoundError } from "./resource.service";
import { PUBLIC_RESOURCE_CARD_SELECT } from "./public-resource.service";
import type { Role } from "@/server/auth/rbac";
import type { DownloadDeliveryMethod } from "@prisma/client";

type MaybeActor = { id: string; role: Role } | null;

const STAFF_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

// How long a repeat view from the same (resource, session) is considered
// a duplicate of the same visit rather than a new one.
const VIEW_DEDUP_WINDOW_MINUTES = 30;
const MINIMUM_DWELL_SECONDS_FOR_PAYOUT = 20;
// How many downloads from the same (resource, ip) within this window are
// allowed before further ones are flagged as rate-limited.
const DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS = 60;
const DOWNLOAD_RATE_LIMIT_MAX = 5;

// ------------------------------------------------------------
// VIEWS
// ------------------------------------------------------------

export type RecordViewInput = {
  resourceId: string;
  viewer: MaybeActor;
  sessionId: string;
  ipHash?: string;
  userAgent?: string | null;
  referrer?: string | null;
};

/**
 * Records a resource-page view. This is the exact function the public
 * resource page calls — no rewrite expected of callers. It is
 * intentionally NOT called from anywhere else: opening a PDF, loading a
 * cover thumbnail, or an admin reviewing a submission are not "a visitor
 * viewed the resource page" events.
 *
 * Every call inserts a row (the raw, permanent audit layer — this is
 * financially sensitive data and nothing is ever silently dropped).
 * `isEligible` gates whether it also increments `Resource.viewsCount`;
 * that flag — NOT `payoutEligible`, which is reserved and unused — is
 * what today's dashboard reads.
 *
 * The dedup check ("has this session already viewed this resource
 * recently?") and the resulting insert run inside a single DB transaction
 * guarded by a Postgres advisory lock keyed on (resourceId, sessionId).
 * Without that lock, two near-simultaneous requests could both read "no
 * recent duplicate" before either had inserted its row, and both would
 * then be recorded eligible — silently doubling a single visit's count.
 * The lock serializes any concurrent calls for the same key; it is held
 * only for the duration of this transaction and released automatically
 * on commit or rollback.
 */
export async function recordResourceView(input: RecordViewInput) {
  const resource = await prisma.resource.findUnique({ where: { id: input.resourceId } });
  if (!resource) throw new NotFoundError();

  // No legitimate public page exists for a resource that isn't PUBLISHED —
  // don't manufacture a "view" for a draft/under-review resource.
  if (resource.status !== "PUBLISHED") {
    return null;
  }

  const isSelfAccess = input.viewer?.id === resource.uploadedById;
  const isStaffAccess = !!input.viewer && STAFF_ROLES.includes(input.viewer.role);
  const isBot = isLikelyBot(input.userAgent);

  // Phase 8.5: a single additive, read-only lookup — never blocks or
  // retries, never inside the lock/transaction below (per the approved
  // concurrency rule, a view may legitimately observe attribution state
  // either just before or just after a concurrent referral commit; both
  // are valid, so there is no reason to serialize this read against
  // anything). Explicitly has no influence on isDuplicate/isSelfAccess/
  // isStaffAccess/isBot/isEligible above or below — it is computed
  // independently and only stamped onto the row already being created.
  const referralAttributionId = await getActiveAttributionId({
    sessionId: input.sessionId,
    userId: input.viewer?.id,
  });

  const lockKey = toAdvisoryLockKey(`view:${input.resourceId}:${input.sessionId}`);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    const since = new Date(Date.now() - VIEW_DEDUP_WINDOW_MINUTES * 60 * 1000);
    const recentDuplicate = await tx.resourceView.findFirst({
      where: { resourceId: input.resourceId, sessionId: input.sessionId, createdAt: { gte: since } },
      select: { id: true },
    });
    const isDuplicate = !!recentDuplicate;
    const isEligible = !isDuplicate && !isSelfAccess && !isStaffAccess && !isBot;

    const view = await tx.resourceView.create({
      data: {
        resourceId: input.resourceId,
        userId: input.viewer?.id,
        sessionId: input.sessionId,
        ipHash: input.ipHash,
        device: input.userAgent ? deviceFromUserAgent(input.userAgent) : undefined,
        referrer: input.referrer ?? undefined,
        isDuplicate,
        isSelfAccess,
        isStaffAccess,
        isBot,
        isEligible,
        referralAttributionId: referralAttributionId ?? undefined,
      },
    });

    if (isEligible) {
      await tx.resource.update({
        where: { id: input.resourceId },
        data: { viewsCount: { increment: 1 } },
      });
    }

    return view;
  });
}

function deviceFromUserAgent(ua: string): string {
  return /mobile|android|iphone/i.test(ua) ? "mobile" : "desktop";
}

// ------------------------------------------------------------
// DOWNLOADS
// ------------------------------------------------------------

export type RecordDownloadInput = {
  resourceId: string;
  downloader: MaybeActor;
  ipHash?: string;
  /**
   * How the caller is about to deliver the bytes. Required — see
   * `DownloadDeliveryMethod` in schema.prisma for exactly what each value
   * does and doesn't guarantee. This function does not itself stream or
   * redirect anything; the caller decides that and reports it here.
   */
  deliveryMethod: DownloadDeliveryMethod;
};

/**
 * Records an authorized download request. Deliberately NOT called
 * "confirmed download" anywhere in this codebase: for `deliveryMethod:
 * "REDIRECT"` (the S3-compatible provider), this server only issues a
 * redirect to a time-limited signed URL — the actual byte transfer
 * happens directly between the client and the storage provider and is
 * never observed here. Only `deliveryMethod: "STREAM"` (the local
 * provider today) means this server personally sent every byte, and even
 * that doesn't prove the client's connection didn't drop mid-transfer.
 * Treat this table as "authorized access events", not "confirmed
 * receipts" — a future payout phase will need to decide what additional
 * confirmation (if any) it requires before trusting a REDIRECT delivery.
 *
 * Unlike views, a download is unambiguous in the sense that matters here
 * — it's kept entirely separate from view tracking (different table,
 * different eligibility rules, no shared dedup window). The rate-limit
 * check-then-insert is guarded the same way as the view dedup check: a
 * transaction plus an advisory lock keyed on (resourceId, ipHash), so
 * concurrent requests from the same IP can't all read "under the limit"
 * before any of them has inserted its row.
 */
export async function recordResourceDownload(input: RecordDownloadInput) {
  const resource = await prisma.resource.findUnique({ where: { id: input.resourceId } });
  if (!resource) throw new NotFoundError();

  const isSelfAccess = input.downloader?.id === resource.uploadedById;
  const isStaffAccess = !!input.downloader && STAFF_ROLES.includes(input.downloader.role);

  return prisma.$transaction(async (tx) => {
    let isRateLimited = false;

    if (input.ipHash) {
      const lockKey = toAdvisoryLockKey(`download:${input.resourceId}:${input.ipHash}`);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      const since = new Date(Date.now() - DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS * 1000);
      const recentCount = await tx.resourceDownload.count({
        where: { resourceId: input.resourceId, ipHash: input.ipHash, createdAt: { gte: since } },
      });
      isRateLimited = recentCount >= DOWNLOAD_RATE_LIMIT_MAX;
    }

    const isEligible = !isSelfAccess && !isStaffAccess && !isRateLimited;

    const download = await tx.resourceDownload.create({
      data: {
        resourceId: input.resourceId,
        userId: input.downloader?.id,
        ipHash: input.ipHash,
        deliveryMethod: input.deliveryMethod,
        isSelfAccess,
        isStaffAccess,
        isRateLimited,
        isEligible,
      },
    });

    if (isEligible) {
      await tx.resource.update({
        where: { id: input.resourceId },
        data: { downloadsCount: { increment: 1 } },
      });
    }

    return download;
  });
}

// ------------------------------------------------------------
// BOOKMARKS
// ------------------------------------------------------------

/**
 * Toggles a bookmark for the current user. Unlike views/downloads this is
 * an explicit, deliberate user action (a button click), not something
 * passively triggered by loading a page or file — so there's no
 * self/staff/bot eligibility filtering to apply here, and the underlying
 * `Favorite` unique constraint already makes this naturally idempotent.
 *
 * This is the database/service layer only. The button wired to it in this
 * phase (on the publisher/admin resource detail page) is explicitly NOT
 * the final public bookmark UX — that ships with the public resource page.
 */
export async function toggleResourceBookmark(actor: { id: string }, resourceId: string) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new NotFoundError();

  const existing = await prisma.favorite.findUnique({
    where: { userId_resourceId: { userId: actor.id, resourceId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.favorite.delete({ where: { id: existing.id } }),
      prisma.resource.update({
        where: { id: resourceId },
        data: { bookmarksCount: { decrement: 1 } },
      }),
    ]);
    return { bookmarked: false };
  }

  await prisma.$transaction([
    prisma.favorite.create({ data: { userId: actor.id, resourceId } }),
    prisma.resource.update({
      where: { id: resourceId },
      data: { bookmarksCount: { increment: 1 } },
    }),
  ]);
  return { bookmarked: true };
}

/**
 * Phase 18 (Account Self-Service): the user's own favorited resources,
 * for /account/favorites. Read-only — no notion of "view someone else's
 * favorites" exists or is added here; always scoped to `actor.id`.
 *
 * Deliberately filters to `status: "PUBLISHED"` rather than returning
 * every Favorite row: a resource that was unpublished after being
 * favorited must not leak through this read path, same principle
 * `public-resource.service.ts` states for every other public-facing
 * query ("regardless of caller"). The Favorite row itself is untouched
 * either way — it simply reappears here if the resource is republished,
 * and disappears on its own if the resource is hard-deleted (cascade).
 *
 * Selects via the exact same `PUBLIC_RESOURCE_CARD_SELECT` shape the
 * public resource-list pages use, so the existing `ResourceCard`
 * component renders these with no changes.
 */
export async function listFavoriteResources(
  actor: { id: string },
  params: { take?: number; skip?: number },
) {
  const { take = 20, skip = 0 } = params;

  const rows = await prisma.favorite.findMany({
    where: { userId: actor.id, resource: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    skip,
    select: { resource: { select: PUBLIC_RESOURCE_CARD_SELECT } },
  });

  const hasMore = rows.length > take;
  const favorites = (hasMore ? rows.slice(0, take) : rows).map((f) => f.resource);
  return { favorites, hasMore };
}

/**
 * Marks a view as dwell-time-qualified for a future payout period.
 * Called by the client only after MINIMUM_DWELL_SECONDS_FOR_PAYOUT has
 * passed on the page — never trust the client's word on WHICH view or
 * WHETHER it was eligible; both are re-checked here against the row
 * that `recordResourceView` already wrote server-side.
 */
export async function qualifyResourceView(viewId: string): Promise<void> {
  const view = await prisma.resourceView.findUnique({
    where: { id: viewId },
    select: { isEligible: true, qualifiedAt: true },
  });

  if (!view || !view.isEligible || view.qualifiedAt) return;

  await prisma.resourceView.update({
    where: { id: viewId },
    data: { qualifiedAt: new Date() },
  });
}

/**
 * Phase 11 (Student Experience): the current student's own recent
 * resource-view history, for the "Recently Viewed" strip on
 * /account. Read-only, always scoped to `actor.id`.
 *
 * Deliberately selects ONLY `resourceId`/`createdAt` off ResourceView —
 * never isDuplicate/isSelfAccess/isStaffAccess/isBot/isEligible/
 * payoutEligible/referralAttributionId. Those are internal
 * fraud/payout-pipeline fields, not something a student's own "what did
 * I look at" list should expose, and this function has no bearing on
 * (and does not touch) the Raw -> Valid -> Eligible analytics pipeline
 * those flags belong to.
 *
 * `distinct: ["resourceId"]` + `orderBy: { createdAt: "desc" }` gives one
 * row per resource, keyed on its most recent view — exactly "recently
 * viewed", not a raw view log. Filters to `status: "PUBLISHED"` for the
 * same reason `listFavoriteResources` does: a resource unpublished after
 * being viewed must not leak through this read path.
 *
 * Fixed-size and unpaginated by design — this is a small "continue"
 * widget, not an archive/listing page. If a full history page is ever
 * wanted, that's a new surface, not an extension of this function.
 */
export async function listRecentlyViewedResources(
  actor: { id: string },
  params: { take?: number } = {},
) {
  const { take = 6 } = params;

  const rows = await prisma.resourceView.findMany({
    where: { userId: actor.id, resource: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    distinct: ["resourceId"],
    take,
    select: { createdAt: true, resource: { select: PUBLIC_RESOURCE_CARD_SELECT } },
  });

  return rows.map((row) => ({ resource: row.resource, viewedAt: row.createdAt }));
}

export { MINIMUM_DWELL_SECONDS_FOR_PAYOUT };
