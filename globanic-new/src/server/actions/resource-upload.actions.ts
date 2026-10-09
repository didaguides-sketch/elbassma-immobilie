"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { ForbiddenError } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import { StorageValidationError } from "@/server/storage";
import {
  uploadResourceDocument,
  uploadResourceCoverImage,
  deleteResourceCoverImage,
} from "@/server/services/resource-upload.service";

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

function toUploadState(error: unknown): UploadFormState {
  if (error instanceof ForbiddenError) {
    return { success: false, message: "غير مصرح لك برفع ملفات لهذا المورد." };
  }
  if (error instanceof NotFoundError) {
    return { success: false, message: "المورد غير موجود." };
  }
  if (error instanceof ValidationError || error instanceof StorageValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[resource-upload.actions] unexpected error:", error);
  return { success: false, message: "حدث خطأ غير متوقع أثناء رفع الملف." };
}

export async function uploadResourceDocumentAction(
  resourceId: string,
  _prevState: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const session = await requireSession(resourceId);

  const file = formData.get("file");
  const changeNoteRaw = formData.get("changeNote");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "الرجاء اختيار ملف PDF." };
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
    return { success: true, message: "تم رفع الملف بنجاح كنسخة جديدة." };
  } catch (error) {
    return toUploadState(error);
  }
}

export async function uploadResourceCoverAction(
  resourceId: string,
  _prevState: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const session = await requireSession(resourceId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "الرجاء اختيار صورة." };
  }

  try {
    await uploadResourceCoverImage(
      { id: session.user.id, role: session.user.role },
      resourceId,
      file,
    );
    revalidatePath(`/publisher/resources/${resourceId}`);
    return { success: true, message: "تم تحديث صورة الغلاف." };
  } catch (error) {
    return toUploadState(error);
  }
}

export async function deleteResourceCoverAction(resourceId: string): Promise<UploadFormState> {
  const session = await requireSession(resourceId);

  try {
    await deleteResourceCoverImage({ id: session.user.id, role: session.user.role }, resourceId);
    revalidatePath(`/publisher/resources/${resourceId}`);
    return { success: true, message: "تم حذف صورة الغلاف." };
  } catch (error) {
    return toUploadState(error);
  }
}

export { initialUploadState };
