"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { ForbiddenError } from "@/server/auth/rbac";
import {
  approveResource,
  rejectResource,
  requestResourceChanges,
  unpublishResource,
} from "@/server/services/moderation.service";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";

export type AdminActionResult = { success: boolean; message?: string };

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/resources");
  }
  return session;
}

function toResult(error: unknown): AdminActionResult {
  if (error instanceof ForbiddenError) return { success: false, message: "غير مصرح لك بهذا الإجراء." };
  if (error instanceof NotFoundError) return { success: false, message: "المورد غير موجود." };
  if (error instanceof ValidationError) return { success: false, message: error.message };
  // eslint-disable-next-line no-console
  console.error("[admin-resource.actions] unexpected error:", error);
  return { success: false, message: "حدث خطأ غير متوقع." };
}

export async function approveResourceAction(resourceId: string): Promise<AdminActionResult> {
  const session = await requireAdminSession();
  try {
    await approveResource({ id: session.user.id, role: session.user.role }, resourceId);
    revalidatePath("/admin/resources");
    return { success: true, message: "تم نشر المورد." };
  } catch (error) {
    return toResult(error);
  }
}

export async function rejectResourceAction(
  resourceId: string,
  reason: string,
): Promise<AdminActionResult> {
  const session = await requireAdminSession();
  try {
    await rejectResource({ id: session.user.id, role: session.user.role }, resourceId, reason);
    revalidatePath("/admin/resources");
    return { success: true, message: "تم رفض المورد." };
  } catch (error) {
    return toResult(error);
  }
}

export async function requestChangesResourceAction(
  resourceId: string,
  reason: string,
): Promise<AdminActionResult> {
  const session = await requireAdminSession();
  try {
    await requestResourceChanges(
      { id: session.user.id, role: session.user.role },
      resourceId,
      reason,
    );
    revalidatePath("/admin/resources");
    return { success: true, message: "تم إرسال طلب التعديلات إلى الناشر." };
  } catch (error) {
    return toResult(error);
  }
}

export async function unpublishResourceAction(
  resourceId: string,
  reason?: string,
): Promise<AdminActionResult> {
  const session = await requireAdminSession();
  try {
    await unpublishResource({ id: session.user.id, role: session.user.role }, resourceId, reason);
    revalidatePath("/admin/resources");
    return { success: true, message: "تم إلغاء نشر المورد." };
  } catch (error) {
    return toResult(error);
  }
}
