import { prisma } from "@/lib/prisma";
import { can, ForbiddenError, type Role } from "@/server/auth/rbac";
import { NotFoundError } from "./resource.service";

export type MaybeActor = { id: string; role: Role } | null;

async function loadResourceWithAccessCheck(actor: MaybeActor, resourceId: string) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new NotFoundError();

  // A PUBLISHED resource's cover/document is public by definition — this
  // is what makes /resources/[type]/[slug] (a future phase) able to render
  // them without a session. Every other status is gated.
  if (resource.status === "PUBLISHED") return resource;

  if (!actor) throw new ForbiddenError();

  const isOwner = resource.uploadedById === actor.id;
  if (!isOwner && !can(actor.role, "resource:view-any")) {
    throw new ForbiddenError();
  }

  return resource;
}

export async function getResourceCoverAccess(actor: MaybeActor, resourceId: string) {
  const resource = await loadResourceWithAccessCheck(actor, resourceId);

  if (!resource.coverImageKey) throw new NotFoundError();

  return {
    storageKey: resource.coverImageKey,
    mimeType: resource.coverImageMimeType ?? "application/octet-stream",
  };
}

export async function getResourceDocumentAccess(
  actor: MaybeActor,
  resourceId: string,
  versionNumber?: number,
) {
  const resource = await loadResourceWithAccessCheck(actor, resourceId);

  const version = await prisma.resourceVersion.findFirst({
    where: {
      resourceId,
      ...(versionNumber ? { versionNumber } : {}),
    },
    orderBy: { versionNumber: "desc" },
    include: { file: true },
  });

  if (!version?.file) throw new NotFoundError();

  return {
    storageKey: version.file.storageKey,
    mimeType: version.file.mimeType,
    filename: version.file.originalFilename ?? `${resource.slug}.pdf`,
  };
}
