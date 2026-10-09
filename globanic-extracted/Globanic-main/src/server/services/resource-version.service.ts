import { prisma } from "@/lib/prisma";
import { can, requireRole, ForbiddenError, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "./resource.service";

type Actor = { id: string; role: Role };

export type FileMetadata = {
  storageKey: string;
  fileUrl: string;
  originalFilename?: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
};

// Publishers may only attach files while the resource is still editable —
// once submitted, changing the underlying document must go through the
// same "changes requested -> edit -> resubmit" cycle as metadata edits.
const PUBLISHER_UPLOADABLE_STATUSES = ["DRAFT", "CHANGES_REQUESTED"] as const;

/**
 * Creates the next version of a resource's file. Never deletes or
 * overwrites a previous ResourceVersion/ResourceFile — history is kept
 * indefinitely (spec section 17). The caller (resource-upload.service.ts)
 * has already uploaded the binary to the storage provider and validated
 * it; this function only persists the resulting metadata.
 */
export async function addResourceVersion(
  actor: Actor,
  resourceId: string,
  file: FileMetadata,
  changeNote?: string,
) {
  requireRole(actor.role, ["PUBLISHER", "ADMIN", "SUPER_ADMIN"]);

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new NotFoundError();

  const isOwner = resource.uploadedById === actor.id;
  const canEditAny = can(actor.role, "resource:edit-any");

  if (!isOwner && !canEditAny) {
    throw new ForbiddenError();
  }

  if (isOwner && actor.role === "PUBLISHER" && !canEditAny) {
    if (!PUBLISHER_UPLOADABLE_STATUSES.includes(resource.status as (typeof PUBLISHER_UPLOADABLE_STATUSES)[number])) {
      throw new ValidationError(
        "لا يمكن رفع ملف جديد لهذا المورد في حالته الحالية — فقط في وضع مسودة أو بعد طلب تعديلات.",
      );
    }
  }

  const lastVersion = await prisma.resourceVersion.findFirst({
    where: { resourceId },
    orderBy: { versionNumber: "desc" },
  });
  const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  return prisma.resourceVersion.create({
    data: {
      resourceId,
      versionNumber: nextVersionNumber,
      changeNote,
      createdById: actor.id,
      file: { create: file },
    },
    include: { file: true },
  });
}

export async function listResourceVersions(actor: Actor, resourceId: string) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new NotFoundError();

  const isOwner = resource.uploadedById === actor.id;
  if (!isOwner && !can(actor.role, "resource:view-any")) {
    throw new ForbiddenError();
  }

  return prisma.resourceVersion.findMany({
    where: { resourceId },
    orderBy: { versionNumber: "desc" },
    include: { file: true, createdBy: { select: { id: true, email: true } } },
  });
}
