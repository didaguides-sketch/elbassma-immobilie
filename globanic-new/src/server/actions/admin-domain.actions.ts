"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { ForbiddenError } from "@/server/auth/rbac";
import { domainInputSchema } from "@/lib/validation/domain.schema";
import { createDomain, updateDomain, deleteDomain } from "@/server/services/domain-admin.service";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";

export type DomainFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  domainId?: string;
};

function extractFromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    icon: formData.get("icon"),
    order: formData.get("order"),
  };
}

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/domains");
  }
  return session;
}

function toFormState(error: unknown): DomainFormState {
  if (error instanceof ForbiddenError) {
    return { success: false, message: "غير مصرح لك بتنفيذ هذا الإجراء." };
  }
  if (error instanceof NotFoundError) {
    return { success: false, message: "المجال غير موجود." };
  }
  if (error instanceof ValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[admin-domain.actions] unexpected error:", error);
  return { success: false, message: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

export async function createDomainAction(
  _prevState: DomainFormState,
  formData: FormData,
): Promise<DomainFormState> {
  const session = await requireAdminSession();

  const parsed = domainInputSchema.safeParse(extractFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const domain = await createDomain({ id: session.user.id, role: session.user.role }, parsed.data);
    revalidatePath("/admin/domains");
    return { success: true, message: "تم إنشاء المجال.", domainId: domain.id };
  } catch (error) {
    return toFormState(error);
  }
}

export async function updateDomainAction(
  domainId: string,
  _prevState: DomainFormState,
  formData: FormData,
): Promise<DomainFormState> {
  const session = await requireAdminSession();

  const parsed = domainInputSchema.safeParse(extractFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateDomain({ id: session.user.id, role: session.user.role }, domainId, parsed.data);
    revalidatePath("/admin/domains");
    revalidatePath(`/admin/domains/${domainId}`);
    return { success: true, message: "تم حفظ التعديلات." };
  } catch (error) {
    return toFormState(error);
  }
}

export async function deleteDomainAction(
  domainId: string,
): Promise<{ success: boolean; message?: string }> {
  const session = await requireAdminSession();

  try {
    await deleteDomain({ id: session.user.id, role: session.user.role }, domainId);
    revalidatePath("/admin/domains");
    return { success: true, message: "تم حذف المجال." };
  } catch (error) {
    return toFormState(error);
  }
}
