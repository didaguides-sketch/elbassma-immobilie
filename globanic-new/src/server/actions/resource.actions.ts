"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { ForbiddenError } from "@/server/auth/rbac";
import {
  createResourceSchema,
  updateResourceSchema,
  parseKeywordsField,
} from "@/lib/validation/resource.schema";
import {
  createResource,
  updateResource,
  deleteResource,
  submitResourceForReview,
  NotFoundError,
  ValidationError,
} from "@/server/services/resource.service";

export type ResourceFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  resourceId?: string;
};

const initialState: ResourceFormState = { success: false };

function extractMetadataFromFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    type: formData.get("type"),
    abstract: formData.get("abstract"),
    description: formData.get("description"),
    keywords: parseKeywordsField(formData.get("keywords")),
    domainId: formData.get("domainId"),
    specialtyId: formData.get("specialtyId"),
    universityId: formData.get("universityId"),
    facultyId: formData.get("facultyId"),
    level: formData.get("level"),
    year: formData.get("year"),
    language: formData.get("language"),
    authorName: formData.get("authorName"),
  };
}

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/publisher/resources");
  }
  return session;
}

/** Maps thrown service errors to a form-friendly state instead of a hard crash. */
function toFormState(error: unknown): ResourceFormState {
  if (error instanceof ForbiddenError) {
    return { success: false, message: "غير مصرح لك بتنفيذ هذا الإجراء." };
  }
  if (error instanceof NotFoundError) {
    return { success: false, message: "المورد غير موجود." };
  }
  if (error instanceof ValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[resource.actions] unexpected error:", error);
  return { success: false, message: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

export async function createResourceAction(
  _prevState: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const session = await requireSession();

  const parsed = createResourceSchema.safeParse(extractMetadataFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const resource = await createResource(
      { id: session.user.id, role: session.user.role },
      parsed.data,
    );
    revalidatePath("/publisher/resources");
    return {
      success: true,
      message: "تم إنشاء المسودة بنجاح.",
      resourceId: resource.id,
    };
  } catch (error) {
    return toFormState(error);
  }
}

export async function updateResourceAction(
  resourceId: string,
  _prevState: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const session = await requireSession();

  const parsed = updateResourceSchema.safeParse(extractMetadataFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateResource({ id: session.user.id, role: session.user.role }, resourceId, parsed.data);
    revalidatePath("/publisher/resources");
    revalidatePath(`/publisher/resources/${resourceId}`);
    return { success: true, message: "تم حفظ التعديلات." };
  } catch (error) {
    return toFormState(error);
  }
}

export async function submitResourceAction(resourceId: string): Promise<ResourceFormState> {
  const session = await requireSession();

  try {
    await submitResourceForReview({ id: session.user.id, role: session.user.role }, resourceId);
    revalidatePath("/publisher/resources");
    revalidatePath(`/publisher/resources/${resourceId}`);
    return { success: true, message: "تم إرسال المورد للمراجعة." };
  } catch (error) {
    return toFormState(error);
  }
}

export async function deleteResourceAction(resourceId: string): Promise<ResourceFormState> {
  const session = await requireSession();

  try {
    await deleteResource({ id: session.user.id, role: session.user.role }, resourceId);
    revalidatePath("/publisher/resources");
    return { success: true, message: "تم حذف المسودة." };
  } catch (error) {
    return toFormState(error);
  }
}

export { initialState as initialResourceFormState };
