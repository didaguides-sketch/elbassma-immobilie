import { prisma } from "@/lib/prisma";
import { can, requirePermission, ForbiddenError, type Role } from "@/server/auth/rbac";
import { toAdvisoryLockKey } from "@/lib/utils/advisory-lock";
import { NotFoundError, ValidationError } from "./resource.service";
import type { AccountStatus, Prisma } from "@prisma/client";

type Actor = { id: string; role: Role };

// PUBLISHER is deliberately excluded, per the approved plan: it must stay
// exclusively tied to the Phase 6 verification workflow (application +
// proof-document audit trail). Admin User Management can promote/demote
// between plain USER and staff roles only.
const DIRECTLY_ASSIGNABLE_ROLES: Role[] = ["USER", "ADMIN", "SUPER_ADMIN"];

async function withUserAdminLock<T>(
  targetUserId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const lockKey = toAdvisoryLockKey(`user-admin:${targetUserId}`);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
    return work(tx);
  });
}

/**
 * A non-SUPER_ADMIN can never act on their own account or on another
 * staff account (ADMIN/SUPER_ADMIN) — only SUPER_ADMIN can. This also
 * blocks any self-lockout/self-promotion regardless of action type.
 */
function assertCanTargetUser(actor: Actor, target: { id: string; role: Role }) {
  if (target.id === actor.id) {
    throw new ValidationError("لا يمكنك تنفيذ هذا الإجراء على حسابك الخاص.");
  }
  if ((target.role === "ADMIN" || target.role === "SUPER_ADMIN") && actor.role !== "SUPER_ADMIN") {
    throw new ForbiddenError();
  }
}

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

export async function listUsers(
  actor: Actor,
  params: { query?: string; role?: Role; status?: AccountStatus; take?: number; skip?: number },
) {
  requirePermission(actor.role, "user:view-any");

  const { query, role, status, take = 20, skip = 0 } = params;

  const rows = await prisma.user.findMany({
    where: {
      role,
      status,
      email: query ? { contains: query, mode: "insensitive" } : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    skip,
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      profile: { select: { fullName: true } },
    },
  });

  const hasMore = rows.length > take;
  return { users: hasMore ? rows.slice(0, take) : rows, hasMore };
}

export async function getUserDetail(actor: Actor, userId: string) {
  requirePermission(actor.role, "user:view-any");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      _count: {
        select: { resourcesUploaded: true, publisherApplications: true },
      },
    },
  });

  if (!user) throw new NotFoundError();
  return user;
}

// ------------------------------------------------------------
// SUSPEND / ACTIVATE
// ------------------------------------------------------------

export async function suspendUser(actor: Actor, targetUserId: string, reason?: string) {
  requirePermission(actor.role, "user:suspend");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError();
  assertCanTargetUser(actor, target);

  return withUserAdminLock(targetUserId, async (tx) => {
    const current = await tx.user.findUnique({ where: { id: targetUserId } });
    if (!current) throw new NotFoundError();

    // Idempotent: already suspended is a no-op, not a duplicate log entry.
    if (current.status === "SUSPENDED") return current;

    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: { status: "SUSPENDED" },
    });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "SUSPEND_USER",
        // Phase 17: previously this was `reason?.trim() || null` — the
        // ModerationLog row named no target at all (no resourceId/reportId
        // applies here, and CHANGE_ROLE/ACTIVATE_USER had the same gap).
        // Embedding the target directly in `reason` is the minimal fix:
        // no schema change, same technique already used for CHANGE_ROLE's
        // "previousRole -> newRole" and the Phase 16 catalog CRUD reasons.
        reason: `User ${target.email} (${targetUserId}) suspended${
          reason?.trim() ? ` — ${reason.trim()}` : ""
        }`,
      },
    });

    return updated;
  });
}

export async function activateUser(actor: Actor, targetUserId: string) {
  requirePermission(actor.role, "user:activate");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError();
  assertCanTargetUser(actor, target);

  return withUserAdminLock(targetUserId, async (tx) => {
    const current = await tx.user.findUnique({ where: { id: targetUserId } });
    if (!current) throw new NotFoundError();

    if (current.status === "ACTIVE") return current;

    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: { status: "ACTIVE" },
    });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "ACTIVATE_USER",
        reason: `User ${target.email} (${targetUserId}) activated`,
      },
    });

    return updated;
  });
}

// ------------------------------------------------------------
// ROLE CHANGE (SUPER_ADMIN only, USER/ADMIN/SUPER_ADMIN only)
// ------------------------------------------------------------

export async function changeUserRole(actor: Actor, targetUserId: string, newRole: Role) {
  requirePermission(actor.role, "user:change-role");

  if (!DIRECTLY_ASSIGNABLE_ROLES.includes(newRole)) {
    throw new ValidationError(
      "لا يمكن تعيين دور PUBLISHER مباشرة — هذه الصلاحية تُمنح فقط عبر مسار التحقق من الناشرين.",
    );
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError();
  assertCanTargetUser(actor, target);

  return withUserAdminLock(targetUserId, async (tx) => {
    const current = await tx.user.findUnique({ where: { id: targetUserId } });
    if (!current) throw new NotFoundError();

    // A PUBLISHER's role is exclusively managed by the Phase 6 workflow
    // (verify/suspend) — direct role management here only ever operates
    // between USER/ADMIN/SUPER_ADMIN, on both ends of the transition.
    if (!DIRECTLY_ASSIGNABLE_ROLES.includes(current.role)) {
      throw new ValidationError(
        "هذا المستخدم Publisher — استخدم آلية تعليق الناشر (Phase 6) بدلًا من تغيير الدور المباشر.",
      );
    }

    if (current.role === newRole) return current;

    const previousRole = current.role;

    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "CHANGE_ROLE",
        reason: `User ${target.email} (${targetUserId}): ${previousRole} -> ${newRole}`,
      },
    });

    return updated;
  });
}

export function canManageUsers(role: Role | undefined | null): boolean {
  return can(role, "user:view-any");
}
