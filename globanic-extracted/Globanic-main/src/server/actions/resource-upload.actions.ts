"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { ForbiddenError } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import { StorageValidationError } from "@/server/storage";
import {
  uploadResourceDocument,
  uploadResourceCoverImage,
  deleteResourceCoverImage,
} from "@/server/services/resource-upload.service";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export type UploadFormState = {
  success: boolean;
  message?: string;
};

const initialUploadState: UploadFormState = { success: false };

async function requireSession(resourceId: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/publisher/resources/${resourceId}`);
  }
  return session;
}

/**
 * NOTE (Batch 6): ValidationError/StorageValidationError's own
 * `error.message` is passed through unchanged here — those messages
 * originate in resource.service.ts and resource-upload.service.ts
 * (business-logic/storage service layer), outside this batch's
 * explicit scope (resource.actions.ts / resource-upload.actions.ts
 * only). They remain hardcoded Arabic; flagged in the Batch 6 freeze
 * report as a disclosed, deliberate exception.
 */
function toUploadState(error: unknown, dict: Dictionary): UploadFormState {
  if (error instanceof ForbiddenError) {
    return { success: false, message: dict.publisherDashboard.errorForbiddenUpload };
  }
  if (error instanceof NotFoundError) {
    return { success: false, message: dict.publisherDashboard.errorResourceNotFound };
  }
  if (error instanceof ValidationError || error instanceof StorageValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[resource-upload.actions] unexpected error:", error);
  return { success: false, message: dict.publisherDashboard.errorUnexpectedUpload };
}

export async function uploadResourceDocumentAction(
  resourceId: string,
  _prevState: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const session = await requireSession(resourceId);
  const dict = await getDictionary(await getLocale());

  const file = formData.get("file");
  const changeNoteRaw = formData.get("changeNote");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: dict.publisherDashboard.errorSelectPdfFile };
  }

  const changeNote =
    typeof changeNoteRaw === "string" && changeNoteRaw.trim() ? changeNoteRaw.trim() : undefined;

  try {
    await uploadResourceDocument(
      { id: session.user.id, role: session.user.role },
      resourceId,
      file,
      changeNote,
    );
    revalidatePath(`/publisher/resources/${resourceId}`);
    return { success: true, message: dict.publisherDashboard.successDocumentUploaded };
  } catch (error) {
    return toUploadState(error, dict);
  }
}

export async function uploadResourceCoverAction(
  resourceId: string,
  _prevState: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const session = await requireSession(resourceId);
  const dict = await getDictionary(await getLocale());

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: dict.publisherDashboard.errorSelectImageFile };
  }

  try {
    await uploadResourceCoverImage(
      { id: session.user.id, role: session.user.role },
      resourceId,
      file,
    );
    revalidatePath(`/publisher/resources/${resourceId}`);
    return { success: true, message: dict.publisherDashboard.successCoverUpdated };
  } catch (error) {
    return toUploadState(error, dict);
  }
}

export async function deleteResourceCoverAction(resourceId: string): Promise<UploadFormState> {
  const session = await requireSession(resourceId);
  const dict = await getDictionary(await getLocale());

  try {
    await deleteResourceCoverImage({ id: session.user.id, role: session.user.role }, resourceId);
    revalidatePath(`/publisher/resources/${resourceId}`);
    return { success: true, message: dict.publisherDashboard.successCoverDeleted };
  } catch (error) {
    return toUploadState(error, dict);
  }
}
