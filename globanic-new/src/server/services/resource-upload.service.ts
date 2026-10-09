import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/server/storage";
import { assertValidResourceDocument, assertValidCoverImage } from "@/lib/validation/file.schema";
import { sha256Checksum } from "@/lib/utils/checksum";
import { buildDocumentStorageKey, buildCoverImageStorageKey } from "@/lib/utils/storage-key";
import { can, ForbiddenError, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "./resource.service";
import { addResourceVersion } from "./resource-version.service";

type Actor = { id: string; role: Role };

async function readFileAsBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Uploads a new document (PDF) for a resource and records it as the next
 * ResourceVersion. Ownership/status is checked up front (before any
 * storage I/O) and re-checked inside addResourceVersion() as a second,
 * independent guard.
 */
export async function uploadResourceDocument(
  actor: Actor,
  resourceId: string,
  file: File,
  changeNote?: string,
) {
  if (!file || file.size === 0) {
    throw new ValidationError("لم يتم اختيار ملف.");
  }

  // Fail fast on ownership/status before spending any I/O on storage.
  await assertCanUploadDocument(actor, resourceId);

  const buffer = await readFileAsBuffer(file);
  const { verifiedMimeType, extension } = assertValidResourceDocument(file, buffer);
  const checksum = sha256Checksum(buffer);

  const storage = await getStorageProvider();
  const key = buildDocumentStorageKey(resourceId, extension);
  const { storageKey, fileUrl } = await storage.upload({
    key,
    body: buffer,
    mimeType: verifiedMimeType,
  });

  // addResourceVersion re-checks ownership/status itself (defense in
  // depth — the same pattern used for RBAC route guards elsewhere in the
  // app). If it still throws for some other reason (e.g. a race where the
  // resource was deleted mid-upload), the object we just uploaded is
  // orphaned in storage — clean it up so a rejected upload doesn't
  // silently consume storage forever.
  try {
    return await addResourceVersion(
      actor,
      resourceId,
      {
        storageKey,
        fileUrl,
        originalFilename: file.name,
        mimeType: verifiedMimeType,
        fileSize: file.size,
        checksum,
      },
      changeNote,
    );
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
}

async function assertCanUploadDocument(actor: Actor, resourceId: string) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new NotFoundError();

  const isOwner = resource.uploadedById === actor.id;
  const canEditAny = can(actor.role, "resource:edit-any");

  if (!isOwner && !canEditAny) throw new ForbiddenError();

  if (isOwner && actor.role === "PUBLISHER" && !canEditAny) {
    if (!["DRAFT", "CHANGES_REQUESTED"].includes(resource.status)) {
      throw new ValidationError(
        "لا يمكن رفع ملف جديد لهذا المورد في حالته الحالية — فقط في وضع مسودة أو بعد طلب تعديلات.",
      );
    }
  }

  return resource;
}

// Same rule set applies to cover images; kept as a separate named export
// for clarity at call sites even though the body is identical today.
const assertCanEditResource = assertCanUploadDocument;

export async function uploadResourceCoverImage(actor: Actor, resourceId: string, file: File) {
  if (!file || file.size === 0) {
    throw new ValidationError("لم يتم اختيار صورة.");
  }

  const resource = await assertCanEditResource(actor, resourceId);

  const buffer = await readFileAsBuffer(file);
  const { verifiedMimeType, extension } = assertValidCoverImage(file, buffer);
  const checksum = sha256Checksum(buffer);

  const storage = await getStorageProvider();
  const key = buildCoverImageStorageKey(resourceId, extension);
  const { storageKey, fileUrl } = await storage.upload({
    key,
    body: buffer,
    mimeType: verifiedMimeType,
  });

  const previousKey = resource.coverImageKey;

  let updated;
  try {
    updated = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        coverImageKey: storageKey,
        coverImageUrl: fileUrl,
        coverImageMimeType: verifiedMimeType,
        coverImageSize: file.size,
        coverImageChecksum: checksum,
      },
    });
  } catch (error) {
    // DB write failed — the object we just uploaded is orphaned, clean it
    // up rather than leaving it unreferenced in storage forever.
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }

  // Replace, don't accumulate: a resource has exactly one current cover.
  // Unlike document versions, there's no versioning requirement for covers.
  if (previousKey && previousKey !== storageKey) {
    await storage.delete(previousKey).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[resource-upload.service] failed to delete old cover "${previousKey}":`, err);
    });
  }

  return updated;
}

export async function deleteResourceCoverImage(actor: Actor, resourceId: string) {
  const resource = await assertCanEditResource(actor, resourceId);

  if (!resource.coverImageKey) return resource;

  const storage = await getStorageProvider();
  await storage.delete(resource.coverImageKey).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(
      `[resource-upload.service] failed to delete cover "${resource.coverImageKey}":`,
      err,
    );
  });

  return prisma.resource.update({
    where: { id: resourceId },
    data: {
      coverImageKey: null,
      coverImageUrl: null,
      coverImageMimeType: null,
      coverImageSize: null,
      coverImageChecksum: null,
    },
  });
}
