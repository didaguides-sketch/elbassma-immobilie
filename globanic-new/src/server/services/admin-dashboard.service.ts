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
    recentActivity,
  };
}
