import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/server/storage";
import { assertValidProofDocument } from "@/lib/validation/file.schema";
import { sha256Checksum } from "@/lib/utils/checksum";
import { buildPublisherProofStorageKey } from "@/lib/utils/storage-key";
import { requirePermission, requireRole, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "./resource.service";
import type { PublisherApplicationInput } from "@/lib/validation/publisher-application.schema";
import type { PublisherApplicationStatus } from "@prisma/client";

type Actor = { id: string; role: Role };

const ELEVATED_ROLES: Role[] = ["PUBLISHER", "ADMIN", "SUPER_ADMIN"];

async function readFileAsBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

// ------------------------------------------------------------
// SUBMIT
// ------------------------------------------------------------

export async function submitPublisherApplication(
  actor: Actor,
  input: PublisherApplicationInput,
  proofFile: File,
) {
  if (ELEVATED_ROLES.includes(actor.role)) {
    throw new ValidationError("أنت تملك بالفعل صلاحيات نشر — لا حاجة لتقديم طلب جديد.");
  }

  if (!proofFile || proofFile.size === 0) {
    throw new ValidationError("مستند الإثبات مطلوب.");
  }

  const latest = await prisma.publisherApplication.findFirst({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
  });
  if (latest?.status === "PENDING") {
    throw new ValidationError("لديك طلب قيد المراجعة بالفعل — الرجاء الانتظار حتى تتم مراجعته.");
  }

  if (input.universityId) {
    const uni = await prisma.university.findUnique({ where: { id: input.universityId } });
    if (!uni) throw new ValidationError("الجامعة المحددة غير موجودة.");
  }
  if (input.specialtyId) {
    const specialty = await prisma.specialty.findUnique({ where: { id: input.specialtyId } });
    if (!specialty) throw new ValidationError("التخصص المحدد غير موجود.");
  }

  const buffer = await readFileAsBuffer(proofFile);
  const { verifiedMimeType, extension } = assertValidProofDocument(proofFile, buffer);
  const checksum = sha256Checksum(buffer);

  // The application row doesn't exist yet, but the storage key wants an
  // id to namespace under — generate it up front and pass it explicitly
  // to `create`, instead of the two-step "create then patch" dance.
  const applicationId = randomUUID();

  const storage = await getStorageProvider();
  const key = buildPublisherProofStorageKey(applicationId, extension);
  const { storageKey, fileUrl } = await storage.upload({
    key,
    body: buffer,
    mimeType: verifiedMimeType,
  });

  try {
    return await prisma.publisherApplication.create({
      data: {
        id: applicationId,
        userId: actor.id,
        fullName: input.fullName,
        universityId: input.universityId,
        academicStatus: input.academicStatus,
        specialtyId: input.specialtyId,
        academicEmail: input.academicEmail,
        additionalInfo: input.additionalInfo,
        proofFileKey: storageKey,
        proofFileUrl: fileUrl,
        proofFileMimeType: verifiedMimeType,
        proofFileSize: proofFile.size,
        proofFileChecksum: checksum,
        proofOriginalFilename: proofFile.name,
        status: "PENDING",
      },
    });
  } catch (error) {
    // DB write failed after a successful upload — don't leak the object.
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
}

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

export async function getMyLatestApplication(actor: Actor) {
  return prisma.publisherApplication.findFirst({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    include: { university: true, specialty: { include: { domain: true } } },
  });
}

export type AdminApplicationTab = "all" | "pending" | "verified" | "rejected" | "suspended";

const TAB_STATUS: Record<AdminApplicationTab, PublisherApplicationStatus | undefined> = {
  all: undefined,
  pending: "PENDING",
  verified: "VERIFIED",
  rejected: "REJECTED",
  suspended: "SUSPENDED",
};

export async function listApplicationsForAdmin(actor: Actor, tab: AdminApplicationTab = "all") {
  requireRole(actor.role, ["ADMIN", "SUPER_ADMIN"]);

  const status = TAB_STATUS[tab];

  return prisma.publisherApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, email: true, role: true } },
      university: { select: { name: true } },
      specialty: { select: { name: true } },
    },
  });
}

// ------------------------------------------------------------
// VERIFY
// ------------------------------------------------------------

export async function verifyPublisherApplication(actor: Actor, applicationId: string) {
  requirePermission(actor.role, "publisher:verify");

  const application = await prisma.publisherApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw new NotFoundError();
  if (application.status !== "PENDING") {
    throw new ValidationError("لا يمكن الموافقة على طلب ليس قيد الانتظار.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.publisherApplication.update({
      where: { id: applicationId },
      data: {
        status: "VERIFIED",
        reviewedById: actor.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    await tx.publisherProfile.upsert({
      where: { userId: application.userId },
      update: {
        academicStatus: application.academicStatus,
        universityId: application.universityId,
        specialtyId: application.specialtyId,
        academicEmail: application.academicEmail,
        verifiedAt: new Date(),
      },
      create: {
        userId: application.userId,
        academicStatus: application.academicStatus,
        universityId: application.universityId,
        specialtyId: application.specialtyId,
        academicEmail: application.academicEmail,
        verifiedAt: new Date(),
      },
    });

    const user = await tx.user.findUnique({ where: { id: application.userId } });
    // Never downgrade an ADMIN/SUPER_ADMIN who happens to have an old
    // application row — only elevate a plain USER.
    if (user && user.role === "USER") {
      await tx.user.update({ where: { id: application.userId }, data: { role: "PUBLISHER" } });
    }

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "VERIFY_PUBLISHER",
        reason: `Application ${applicationId} verified`,
      },
    });

    await tx.notification.create({
      data: {
        userId: application.userId,
        type: "PUBLISHER_VERIFIED",
        title: "تمت الموافقة على طلبك",
        message: "تهانينا! تم التحقق من حسابك كناشر (Publisher) على Globanic.",
        link: "/publisher/dashboard",
      },
    });

    return updated;
  });
}

// ------------------------------------------------------------
// REJECT
// ------------------------------------------------------------

export async function rejectPublisherApplication(
  actor: Actor,
  applicationId: string,
  reason: string,
) {
  requirePermission(actor.role, "publisher:reject");
  if (!reason.trim()) throw new ValidationError("سبب الرفض مطلوب.");

  const application = await prisma.publisherApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw new NotFoundError();
  if (application.status !== "PENDING") {
    throw new ValidationError("لا يمكن رفض طلب ليس قيد الانتظار.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.publisherApplication.update({
      where: { id: applicationId },
      data: {
        status: "REJECTED",
        rejectionReason: reason.trim(),
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "REJECT_PUBLISHER",
        // Phase 17: previously `reason.trim()` alone — no id/name of which
        // application or user this was. `application.fullName`/`academicEmail`
        // are already on the row fetched above, so no extra query needed.
        reason: `Application ${applicationId} (${application.fullName}, ${application.academicEmail}) rejected — ${reason.trim()}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: application.userId,
        type: "PUBLISHER_REJECTED",
        title: "تم رفض طلب النشر",
        message: reason.trim(),
        link: "/publisher/apply",
      },
    });

    return updated;
  });
}

// ------------------------------------------------------------
// SUSPEND
// ------------------------------------------------------------

export async function suspendPublisher(actor: Actor, targetUserId: string, reason?: string) {
  requirePermission(actor.role, "publisher:suspend");

  const latestVerified = await prisma.publisherApplication.findFirst({
    where: { userId: targetUserId, status: "VERIFIED" },
    orderBy: { createdAt: "desc" },
  });
  if (!latestVerified) {
    throw new ValidationError("لا يوجد طلب ناشر معتمد لهذا المستخدم.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.publisherApplication.update({
      where: { id: latestVerified.id },
      data: {
        status: "SUSPENDED",
        rejectionReason: reason?.trim() || null,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    const user = await tx.user.findUnique({ where: { id: targetUserId } });
    // Only revoke an actual PUBLISHER — never touch ADMIN/SUPER_ADMIN.
    if (user && user.role === "PUBLISHER") {
      await tx.user.update({ where: { id: targetUserId }, data: { role: "USER" } });
    }

    // PublisherProfile is left intact (historical record) — role on User
    // is the single source of truth RBAC actually checks.

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "SUSPEND_PUBLISHER",
        reason: `Publisher ${user?.email ?? targetUserId} (${targetUserId}) suspended${
          reason?.trim() ? ` — ${reason.trim()}` : ""
        }`,
      },
    });

    await tx.notification.create({
      data: {
        userId: targetUserId,
        type: "PUBLISHER_SUSPENDED",
        title: "تم تعليق صلاحيات النشر",
        message: reason?.trim() || "تم تعليق صلاحيات النشر الخاصة بحسابك من طرف الإدارة.",
        link: "/publisher/apply",
      },
    });

    return updated;
  });
}
