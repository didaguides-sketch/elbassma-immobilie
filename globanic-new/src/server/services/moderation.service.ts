import { prisma } from "@/lib/prisma";
import { requirePermission, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "./resource.service";
import { createNotification } from "./notification.service";
import { toAdvisoryLockKey } from "@/lib/utils/advisory-lock";
import type { ResourceStatus, Prisma } from "@prisma/client";

type Actor = { id: string; role: Role };

async function loadResourceOrThrow(resourceId: string) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new NotFoundError();
  return resource;
}

function assertTransitionAllowed(current: ResourceStatus, allowed: ResourceStatus[]) {
  if (!allowed.includes(current)) {
    throw new ValidationError(
      `لا يمكن تنفيذ هذا الإجراء — حالة المورد الحالية (${current}) لا تسمح بذلك.`,
    );
  }
}

const REVIEWABLE_STATUSES: ResourceStatus[] = ["SUBMITTED", "UNDER_REVIEW"];

/**
 * Every moderation action below follows the same reliability pattern,
 * added in Phase 11 without changing any business rule:
 *
 *  1. A cheap pre-check outside any transaction (fast-fail for an
 *     obviously-invalid request, same as before Phase 11).
 *  2. Inside a single transaction: acquire a Postgres advisory lock keyed
 *     on this resourceId (`toAdvisoryLockKey`, the exact same utility the
 *     Analytics Hardening pass used for view/download dedup), THEN
 *     re-check the status transition as the *authoritative* guard.
 *
 * Why: two concurrent (or retried) "Approve" clicks on the same resource
 * could otherwise both read status=SUBMITTED before either commits, both
 * pass the pre-check, and both transition + both notify — the exact TOCTOU
 * race the Hardening pass fixed for views/downloads, now closed here too.
 * With the lock, the second call serializes behind the first, re-reads the
 * now-PUBLISHED status inside the transaction, and correctly fails the
 * guard — so retries/double-clicks can never produce two ModerationLog
 * rows or two notifications for what is really one action.
 */
async function withResourceModerationLock<T>(
  resourceId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const lockKey = toAdvisoryLockKey(`moderation:${resourceId}`);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
    return work(tx);
  });
}

/**
 * Approve = publish. The schema keeps a distinct APPROVED status available
 * for a future scheduled-publish workflow, but the four admin actions
 * requested (Approve/Reject/Request Changes/Unpublish) map to a direct
 * SUBMITTED|UNDER_REVIEW -> PUBLISHED transition today.
 */
export async function approveResource(actor: Actor, resourceId: string) {
  requirePermission(actor.role, "resource:approve");

  const precheck = await loadResourceOrThrow(resourceId);
  assertTransitionAllowed(precheck.status, REVIEWABLE_STATUSES);

  return withResourceModerationLock(resourceId, async (tx) => {
    const resource = await tx.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundError();
    // Authoritative re-check, inside the lock — see withResourceModerationLock.
    assertTransitionAllowed(resource.status, REVIEWABLE_STATUSES);

    const updated = await tx.resource.update({
      where: { id: resourceId },
      data: { status: "PUBLISHED", publishedAt: new Date(), rejectionReason: null },
    });

    await tx.moderationLog.create({
      data: { actorId: actor.id, resourceId, action: "APPROVE" },
    });

    await createNotification(tx, {
      userId: resource.uploadedById,
      type: "RESOURCE_APPROVED",
      title: "تمت الموافقة على موردك",
      message: `تم نشر موردك "${resource.title}" بنجاح.`,
      link: `/publisher/resources/${resourceId}`,
    });

    return updated;
  });
}

export async function rejectResource(actor: Actor, resourceId: string, reason: string) {
  requirePermission(actor.role, "resource:reject");
  if (!reason.trim()) throw new ValidationError("سبب الرفض مطلوب.");

  const precheck = await loadResourceOrThrow(resourceId);
  assertTransitionAllowed(precheck.status, REVIEWABLE_STATUSES);

  return withResourceModerationLock(resourceId, async (tx) => {
    const resource = await tx.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundError();
    assertTransitionAllowed(resource.status, REVIEWABLE_STATUSES);

    const trimmedReason = reason.trim();

    const updated = await tx.resource.update({
      where: { id: resourceId },
      data: { status: "REJECTED", rejectionReason: trimmedReason },
    });

    await tx.moderationLog.create({
      data: { actorId: actor.id, resourceId, action: "REJECT", reason: trimmedReason },
    });

    await createNotification(tx, {
      userId: resource.uploadedById,
      type: "RESOURCE_REJECTED",
      title: "تم رفض موردك",
      message: `تم رفض موردك "${resource.title}": ${trimmedReason}`,
      link: `/publisher/resources/${resourceId}`,
    });

    return updated;
  });
}

export async function requestResourceChanges(actor: Actor, resourceId: string, reason: string) {
  requirePermission(actor.role, "resource:request-changes");
  if (!reason.trim()) throw new ValidationError("توضيح التعديلات المطلوبة إلزامي.");

  const precheck = await loadResourceOrThrow(resourceId);
  assertTransitionAllowed(precheck.status, REVIEWABLE_STATUSES);

  return withResourceModerationLock(resourceId, async (tx) => {
    const resource = await tx.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundError();
    assertTransitionAllowed(resource.status, REVIEWABLE_STATUSES);

    const trimmedReason = reason.trim();

    const updated = await tx.resource.update({
      where: { id: resourceId },
      data: { status: "CHANGES_REQUESTED", rejectionReason: trimmedReason },
    });

    await tx.moderationLog.create({
      data: { actorId: actor.id, resourceId, action: "REQUEST_CHANGES", reason: trimmedReason },
    });

    await createNotification(tx, {
      userId: resource.uploadedById,
      type: "RESOURCE_CHANGES_REQUESTED",
      title: "مطلوب تعديلات على موردك",
      message: `طلبت الإدارة تعديلات على موردك "${resource.title}": ${trimmedReason}`,
      link: `/publisher/resources/${resourceId}`,
    });

    return updated;
  });
}

export async function unpublishResource(actor: Actor, resourceId: string, reason?: string) {
  requirePermission(actor.role, "resource:unpublish");

  const precheck = await loadResourceOrThrow(resourceId);
  assertTransitionAllowed(precheck.status, ["PUBLISHED"]);

  return withResourceModerationLock(resourceId, async (tx) => {
    const resource = await tx.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundError();
    assertTransitionAllowed(resource.status, ["PUBLISHED"]);

    const trimmedReason = reason?.trim() || null;

    const updated = await tx.resource.update({
      where: { id: resourceId },
      data: { status: "UNPUBLISHED" },
    });

    await tx.moderationLog.create({
      data: { actorId: actor.id, resourceId, action: "UNPUBLISH", reason: trimmedReason },
    });

    // No dedicated RESOURCE_UNPUBLISHED enum value exists (Phase 11 adds
    // zero schema changes, per the approved plan) — SYSTEM is the
    // intended catch-all for exactly this kind of platform-triggered
    // message that doesn't have its own specific type.
    await createNotification(tx, {
      userId: resource.uploadedById,
      type: "SYSTEM",
      title: "تم إلغاء نشر موردك",
      message: trimmedReason
        ? `تم إلغاء نشر موردك "${resource.title}": ${trimmedReason}`
        : `تم إلغاء نشر موردك "${resource.title}".`,
      link: `/publisher/resources/${resourceId}`,
    });

    return updated;
  });
}
