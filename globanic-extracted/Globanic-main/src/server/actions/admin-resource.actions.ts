"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { ForbiddenError } from "@/server/auth/rbac";
import {
  approveResource,
  rejectResource,
  requestResourceChanges,
  unpublishResource,
} from "@/server/services/moderation.service";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export type AdminActionResult = { success: boolean; message?: string };

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/resources");
  }
  return session;
}

/**
 * NOTE (Batch 7B): ValidationError's own `error.message` is passed
 * through unchanged here — those messages originate in
 * moderation.service.ts (business-logic/service layer), outside this
 * batch's explicit action-file scope. Same disclosed exception pattern
 * as Batch 6/7A.
 */
function toResult(error: unknown, dict: Dictionary): AdminActionResult {
  if (error instanceof ForbiddenError) return { success: false, message: dict.adminDashboard.errorUnauthorizedShort };
  if (error instanceof NotFoundError) return { success: false, message: dict.adminDashboard.errorResourceNotFound };
  if (error instanceof ValidationError) return { success: false, message: error.message };
  // eslint-disable-next-line no-console
  console.error("[admin-resource.actions] unexpected error:", error);
  return { success: false, message: dict.adminDashboard.errorUnexpectedNoRetry };
}

export async function approveResourceAction(resourceId: string): Promise<AdminActionResult> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());
  try {
    await approveResource({ id: session.user.id, role: session.user.role }, resourceId);
    revalidatePath("/admin/resources");
    return { success: true, message: dict.adminDashboard.successResourcePublished };
  } catch (error) {
    return toResult(error, dict);
  }
}

export async function rejectResourceAction(
  resourceId: string,
  reason: string,
): Promise<AdminActionResult> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());
  try {
    await rejectResource({ id: session.user.id, role: session.user.role }, resourceId, reason);
    revalidatePath("/admin/resources");
    return { success: true, message: dict.adminDashboard.successResourceRejected };
  } catch (error) {
    return toResult(error, dict);
  }
}

export async function requestChangesResourceAction(
  resourceId: string,
  reason: string,
): Promise<AdminActionResult> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());
  try {
    await requestResourceChanges(
      { id: session.user.id, role: session.user.role },
      resourceId,
      reason,
    );
    revalidatePath("/admin/resources");
    return { success: true, message: dict.adminDashboard.successChangesRequested };
  } catch (error) {
    return toResult(error, dict);
  }
}

export async function unpublishResourceAction(
  resourceId: string,
  reason?: string,
): Promise<AdminActionResult> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());
  try {
    await unpublishResource({ id: session.user.id, role: session.user.role }, resourceId, reason);
    revalidatePath("/admin/resources");
    return { success: true, message: dict.adminDashboard.successResourceUnpublished };
  } catch (error) {
    return toResult(error, dict);
  }
}
