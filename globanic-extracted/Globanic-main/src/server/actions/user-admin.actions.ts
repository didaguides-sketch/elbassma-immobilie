"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { ForbiddenError, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import {
  suspendUser,
  activateUser,
  changeUserRole,
} from "@/server/services/user-admin.service";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export type UserAdminActionResult = { success: boolean; message?: string };

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/users");
  return session;
}

/**
 * NOTE (Batch 7A): ValidationError's own `error.message` is passed
 * through unchanged here — those messages originate in
 * user-admin.service.ts (business-logic/service layer), outside this
 * batch's explicit action-file scope. Same disclosed exception pattern
 * as Batch 6.
 */
function toResult(error: unknown, dict: Dictionary): UserAdminActionResult {
  if (error instanceof ForbiddenError) return { success: false, message: dict.adminDashboard.errorUnauthorizedShort };
  if (error instanceof NotFoundError) return { success: false, message: dict.adminDashboard.errorUserNotFound };
  if (error instanceof ValidationError) return { success: false, message: error.message };
  // eslint-disable-next-line no-console
  console.error("[user-admin.actions] unexpected error:", error);
  return { success: false, message: dict.adminDashboard.errorUnexpectedNoRetry };
}

export async function suspendUserAction(
  targetUserId: string,
  reason?: string,
): Promise<UserAdminActionResult> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());
  try {
    await suspendUser({ id: session.user.id, role: session.user.role }, targetUserId, reason);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${targetUserId}`);
    return { success: true, message: dict.adminDashboard.successUserSuspended };
  } catch (error) {
    return toResult(error, dict);
  }
}

export async function activateUserAction(targetUserId: string): Promise<UserAdminActionResult> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());
  try {
    await activateUser({ id: session.user.id, role: session.user.role }, targetUserId);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${targetUserId}`);
    return { success: true, message: dict.adminDashboard.successUserActivated };
  } catch (error) {
    return toResult(error, dict);
  }
}

export async function changeUserRoleAction(
  targetUserId: string,
  newRole: Role,
): Promise<UserAdminActionResult> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());
  try {
    await changeUserRole({ id: session.user.id, role: session.user.role }, targetUserId, newRole);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${targetUserId}`);
    return { success: true, message: dict.adminDashboard.successUserRoleChanged };
  } catch (error) {
    return toResult(error, dict);
  }
}
