"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { ForbiddenError } from "@/server/auth/rbac";
import { universityInputSchema } from "@/lib/validation/university.schema";
import {
  createUniversity,
  updateUniversity,
  deleteUniversity,
} from "@/server/services/university-admin.service";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";

export type UniversityFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  universityId?: string;
};

function extractFromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    city: formData.get("city"),
    country: formData.get("country"),
    logoUrl: formData.get("logoUrl"),
    officialWebsite: formData.get("officialWebsite"),
  };
}

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/universities");
  }
  return session;
}

function toFormState(error: unknown): UniversityFormState {
  if (error instanceof ForbiddenError) {
    return { success: false, message: "غير مصرح لك بتنفيذ هذا الإجراء." };
  }
  if (error instanceof NotFoundError) {
    return { success: false, message: "الجامعة غير موجودة." };
  }
  if (error instanceof ValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[admin-university.actions] unexpected error:", error);
  return { success: false, message: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

export async function createUniversityAction(
  _prevState: UniversityFormState,
  formData: FormData,
): Promise<UniversityFormState> {
  const session = await requireAdminSession();

  const parsed = universityInputSchema.safeParse(extractFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const university = await createUniversity(
      { id: session.user.id, role: session.user.role },
      parsed.data,
    );
    revalidatePath("/admin/universities");
    return { success: true, message: "تم إنشاء الجامعة.", universityId: university.id };
  } catch (error) {
    return toFormState(error);
  }
}

export async function updateUniversityAction(
  universityId: string,
  _prevState: UniversityFormState,
  formData: FormData,
): Promise<UniversityFormState> {
  const session = await requireAdminSession();

  const parsed = universityInputSchema.safeParse(extractFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateUniversity({ id: session.user.id, role: session.user.role }, universityId, parsed.data);
    revalidatePath("/admin/universities");
    revalidatePath(`/admin/universities/${universityId}`);
    return { success: true, message: "تم حفظ التعديلات." };
  } catch (error) {
    return toFormState(error);
  }
}

export async function deleteUniversityAction(
  universityId: string,
): Promise<{ success: boolean; message?: string }> {
  const session = await requireAdminSession();

  try {
    await deleteUniversity({ id: session.user.id, role: session.user.role }, universityId);
    revalidatePath("/admin/universities");
    return { success: true, message: "تم حذف الجامعة." };
  } catch (error) {
    return toFormState(error);
  }
}
