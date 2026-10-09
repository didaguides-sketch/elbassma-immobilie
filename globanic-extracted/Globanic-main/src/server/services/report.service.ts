import { prisma } from "@/lib/prisma";
import { requirePermission, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "./resource.service";
import { createNotification } from "./notification.service";
import { toAdvisoryLockKey } from "@/lib/utils/advisory-lock";
import { resourceTypeToUrlSegment } from "@/lib/utils/resource-type";
import type { ReportStatus, ReportType, Prisma } from "@prisma/client";

type Actor = { id: string; role: Role };

const MAX_MESSAGE_LENGTH = 1000;

// ------------------------------------------------------------
// SUBMIT (any authenticated user, on a PUBLISHED resource only)
// ------------------------------------------------------------

export async function submitReport(
  actor: Actor,
  resourceId: string,
  type: ReportType,
  message?: string,
) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new NotFoundError();

  // Per the approved scope: reporting applies to published resources —
  // a DRAFT/SUBMITTED/etc. resource isn't publicly visible yet, so
  // there's nothing for an ordinary user to have encountered and be
  // reporting in the first place.
  if (resource.status !== "PUBLISHED") {
    throw new ValidationError("لا يمكن الإبلاغ إلا عن مورد منشور.");
  }

  const trimmedMessage = message?.trim() || null;
  if (trimmedMessage && trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError("نص البلاغ طويل جدًا.");
  }

  // No ModerationLog entry here, by design: submitting a report is an
  // ordinary user action, not a moderation action — the same reason
  // Favorite/Follow don't write to ModerationLog either. ModerationLog
  // only ever records what an *actor with moderation authority* did
  // (RESOLVE_REPORT / DISMISS_REPORT below), matching the enum's actual
  // shape (no "SUBMIT_REPORT" value exists).
  return prisma.report.create({
    data: {
      resourceId,
      reportedById: actor.id,
      type,
      message: trimmedMessage,
    },
  });
}

// ------------------------------------------------------------
// LIST (admin)
// ------------------------------------------------------------

export async function listReportsForAdmin(actor: Actor, status?: ReportStatus) {
  requirePermission(actor.role, "report:view-any");

  return prisma.report.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      resource: { select: { id: true, title: true, type: true, slug: true, status: true } },
      reportedBy: { select: { id: true, email: true } },
    },
  });
}

// ------------------------------------------------------------
// RESOLVE / DISMISS (admin)
// ------------------------------------------------------------

async function withReportLock<T>(
  reportId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const lockKey = toAdvisoryLockKey(`report:${reportId}`);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
    return work(tx);
  });
}

function assertOpen(current: ReportStatus) {
  if (current !== "OPEN") {
    throw new ValidationError(
      `لا يمكن تنفيذ هذا الإجراء — حالة البلاغ الحالية (${current}) لا تسمح بذلك.`,
    );
  }
}

async function loadReportOrThrow(reportId: string) {
  const report = await prisma.report.findUnique({ where: { id: reportId }, include: { resource: true } });
  if (!report) throw new NotFoundError();
  return report;
}

/**
 * Same reliability pattern as moderation.service.ts's resource actions:
 * a cheap pre-check outside the transaction, then an advisory lock keyed
 * on this reportId with an authoritative re-check inside it — so two
 * concurrent Resolve/Dismiss clicks on the same report can never both
 * pass the guard and both write a ModerationLog row / notification.
 *
 * Deliberately does NOT touch `resource.status` in any way — resolving
 * or dismissing a report is a statement about the *report*, not a
 * moderation decision about the resource itself. A resource found to
 * genuinely violate policy is unpublished separately, through
 * `unpublishResource` (Phase 11), by an admin who reviewed the report.
 */
export async function resolveReport(actor: Actor, reportId: string, note?: string) {
  requirePermission(actor.role, "report:resolve");

  const precheck = await loadReportOrThrow(reportId);
  assertOpen(precheck.status);

  const trimmedNote = note?.trim() || null;

  return withReportLock(reportId, async (tx) => {
    const report = await tx.report.findUnique({ where: { id: reportId }, include: { resource: true } });
    if (!report) throw new NotFoundError();
    assertOpen(report.status);

    const updated = await tx.report.update({
      where: { id: reportId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        reportId,
        resourceId: report.resourceId,
        action: "RESOLVE_REPORT",
        reason: trimmedNote,
      },
    });

    if (report.reportedById) {
      await createNotification(tx, {
        userId: report.reportedById,
        type: "REPORT_UPDATE",
        title: "تم التعامل مع بلاغك",
        message: `تمت معالجة بلاغك بخصوص "${report.resource.title}".`,
        link: `/resources/${resourceTypeToUrlSegment(report.resource.type)}/${report.resource.slug}`,
      });
    }

    return updated;
  });
}

export async function dismissReport(actor: Actor, reportId: string, note?: string) {
  requirePermission(actor.role, "report:resolve");

  const precheck = await loadReportOrThrow(reportId);
  assertOpen(precheck.status);

  const trimmedNote = note?.trim() || null;

  return withReportLock(reportId, async (tx) => {
    const report = await tx.report.findUnique({ where: { id: reportId }, include: { resource: true } });
    if (!report) throw new NotFoundError();
    assertOpen(report.status);

    const updated = await tx.report.update({
      where: { id: reportId },
      data: { status: "DISMISSED", resolvedAt: new Date() },
    });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        reportId,
        resourceId: report.resourceId,
        action: "DISMISS_REPORT",
        reason: trimmedNote,
      },
    });

    if (report.reportedById) {
      await createNotification(tx, {
        userId: report.reportedById,
        type: "REPORT_UPDATE",
        title: "تم رفض بلاغك",
        message: `تمت مراجعة بلاغك بخصوص "${report.resource.title}" ولم يُتخذ إجراء.`,
        link: `/resources/${resourceTypeToUrlSegment(report.resource.type)}/${report.resource.slug}`,
      });
    }

    return updated;
  });
}
