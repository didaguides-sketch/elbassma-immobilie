import { prisma } from "@/lib/prisma";
import { requirePermission, type Role } from "@/server/auth/rbac";
import type { ModerationAction, Prisma } from "@prisma/client";

type Actor = { id: string; role: Role };

export type ModerationLogFilters = {
  action?: ModerationAction;
  actorEmail?: string;
  from?: Date;
  to?: Date;
  take?: number;
  skip?: number;
};

const MODERATION_LOG_SELECT = {
  id: true,
  action: true,
  reason: true,
  createdAt: true,
  actor: { select: { id: true, email: true } },
  resourceId: true,
  resource: { select: { id: true, title: true, type: true, slug: true } },
  reportId: true,
  // Phase 17 audit: these existed on the model but were never selected
  // here, so payout-related log rows rendered with no detail at all —
  // data was being written correctly but was invisible in this viewer.
  payoutAccountId: true,
  payoutId: true,
  metadata: true,
} satisfies Prisma.ModerationLogSelect;

/**
 * Read-only. This is the entire surface of Phase 17's Moderation Logs
 * viewer AND the Admin Dashboard's recent-activity preview (both call
 * this) — no create/update/delete path lives here, matching the model's
 * own "never delete rows here" doc comment.
 */
export async function listModerationLogsForAdmin(actor: Actor, filters: ModerationLogFilters = {}) {
  requirePermission(actor.role, "moderation-log:view");

  const take = filters.take ?? 30;
  const skip = filters.skip ?? 0;

  const where: Prisma.ModerationLogWhereInput = {
    action: filters.action,
    actor: filters.actorEmail
      ? { email: { contains: filters.actorEmail, mode: "insensitive" } }
      : undefined,
    createdAt:
      filters.from || filters.to
        ? { gte: filters.from, lte: filters.to }
        : undefined,
  };

  const rows = await prisma.moderationLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    skip,
    select: MODERATION_LOG_SELECT,
  });

  const hasMore = rows.length > take;
  return { logs: hasMore ? rows.slice(0, take) : rows, hasMore };
}
