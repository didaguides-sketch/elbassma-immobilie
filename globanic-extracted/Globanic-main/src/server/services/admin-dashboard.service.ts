import { prisma } from "@/lib/prisma";
import { requireRole, type Role, ADMIN_ROLES } from "@/server/auth/rbac";
import { listModerationLogsForAdmin } from "./moderation-log.service";

type Actor = { id: string; role: Role };

/**
 * Read-only aggregate of counts the admin can already see piecemeal on
 * pages they're already permitted into (Resources/Reports/Users/Publisher
 * Applications) — gated on "is an admin at all" rather than 5 separate
 * fine-grained permission checks for 5 numbers.
 */
export async function getAdminDashboardStats(actor: Actor) {
  requireRole(actor.role, ADMIN_ROLES);

  const [
    pendingResources,
    openReports,
    pendingPublisherApplications,
    totalUsers,
    suspendedUsers,
    totalPublishedResources,
    totalUniversities,
    totalDomains,
    pendingPayoutAccounts,
    payoutsAwaitingPayment,
    latestRevenuePeriod,
    { logs: recentActivity },
  ] = await Promise.all([
    prisma.resource.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.publisherApplication.count({ where: { status: "PENDING" } }),
    prisma.user.count(),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.resource.count({ where: { status: "PUBLISHED" } }),
    prisma.university.count(),
    prisma.domain.count(),
    // Phase 14: real counts for the FINANCE areas the dashboard was
    // previously silent about, gated the same way as every other count
    // here — visible to any admin, since payout-account:verify and
    // payout:view are both ADMIN-level (not SUPER_ADMIN-only).
    prisma.publisherPayoutAccount.count({
      where: { verificationStatus: "PENDING_REVIEW", isActive: true },
    }),
    prisma.publisherPayout.count({ where: { status: { in: ["PENDING", "APPROVED"] } } }),
    prisma.revenuePeriod.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, status: true },
    }),
    listModerationLogsForAdmin(actor, { take: 5 }),
  ]);

  return {
    pendingResources,
    openReports,
    pendingPublisherApplications,
    totalUsers,
    suspendedUsers,
    totalPublishedResources,
    totalUniversities,
    totalDomains,
    pendingPayoutAccounts,
    payoutsAwaitingPayment,
    latestRevenuePeriod,
    recentActivity,
  };
}
