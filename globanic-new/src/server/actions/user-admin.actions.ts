"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { ForbiddenError, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import {
  suspendUser,
  activateUser,
  changeUserRole,
} from "@/server/services/user-admin.service";

export type UserAdminActionResult = { success: boolean; message?: string };

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/users");
  return session;
}

function toResult(error: unknown): UserAdminActionResult {
  if (error instanceof ForbiddenError) return { success: false, message: "غير مصرح لك بهذا الإجراء." };
  if (error instanceof NotFoundError) return { success: false, message: "المستخدم غير موجود." };
  if (error instanceof ValidationError) return { success: false, message: error.message };
  // eslint-disable-next-line no-console
  console.error("[user-admin.actions] unexpected error:", error);
  return { success: false, message: "حدث خطأ غير متوقع." };
}

export async function suspendUserAction(
  targetUserId: string,
  reason?: string,
): Promise<UserAdminActionResult> {
  const session = await requireAdminSession();
  try {
    await suspendUser({ id: session.user.id, role: session.user.role }, targetUserId, reason);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${targetUserId}`);
    return { success: true, message: "تم تعليق الحساب." };
  } catch (error) {
    return toResult(error);
  }
}

export async function activateUserAction(targetUserId: string): Promise<UserAdminActionResult> {
  const session = await requireAdminSession();
  try {
    await activateUser({ id: session.user.id, role: session.user.role }, targetUserId);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${targetUserId}`);
    return { success: true, message: "تم تفعيل الحساب." };
  } catch (error) {
    return toResult(error);
  }
}

export async function changeUserRoleAction(
  targetUserId: string,
  newRole: Role,
): Promise<UserAdminActionResult> {
  const session = await requireAdminSession();
  try {
    await changeUserRole({ id: session.user.id, role: session.user.role }, targetUserId, newRole);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${targetUserId}`);
    return { success: true, message: "تم تغيير الدور." };
  } catch (error) {
    return toResult(error);
  }
}
