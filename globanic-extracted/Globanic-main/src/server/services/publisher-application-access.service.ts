import { prisma } from "@/lib/prisma";
import { can, ForbiddenError, type Role } from "@/server/auth/rbac";
import { NotFoundError } from "./resource.service";

type Actor = { id: string; role: Role };

/**
 * Proof-of-affiliation documents are never public, regardless of the
 * application's status — unlike resource files (public once PUBLISHED).
 * Only the applicant themselves, or an ADMIN/SUPER_ADMIN, may ever read
 * one. There is no "actor: null" path here, unlike
 * resource-access.service.ts — an anonymous request is always rejected
 * by the caller before this function is even invoked.
 */
export async function getPublisherApplicationProofAccess(actor: Actor, applicationId: string) {
  const application = await prisma.publisherApplication.findUnique({
    where: { id: applicationId },
  });
  if (!application) throw new NotFoundError();

  const isOwner = application.userId === actor.id;
  const isAuthorizedAdmin = can(actor.role, "publisher:verify") || can(actor.role, "publisher:reject");

  if (!isOwner && !isAuthorizedAdmin) {
    throw new ForbiddenError();
  }

  if (!application.proofFileKey) throw new NotFoundError();

  return {
    storageKey: application.proofFileKey,
    mimeType: application.proofFileMimeType ?? "application/octet-stream",
    filename: application.proofOriginalFilename ?? "proof-document",
  };
}
