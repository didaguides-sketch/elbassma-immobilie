"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { ForbiddenError } from "@/server/auth/rbac";
import { submitReport, resolveReport, dismissReport } from "@/server/services/report.service";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import { isSafeRelativePath } from "@/lib/utils/safe-redirect";
import type { ReportType } from "@prisma/client";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export type ReportActionResult = { success: boolean; message?: string };

function toResult(error: unknown): ReportActionResult {
  if (error instanceof ForbiddenError) return { success: false, message: "غير مصرح لك بهذا الإجراء." };
  if (error instanceof NotFoundError) return { success: false, message: "العنصر غير موجود." };
  if (error instanceof ValidationError) return { success: false, message: error.message };
  // eslint-disable-next-line no-console
  console.error("[report.actions] unexpected error:", error);
  return { success: false, message: "حدث خطأ غير متوقع." };
}

// ------------------------------------------------------------
// SUBMIT (any authenticated user)
// ------------------------------------------------------------

export async function submitReportAction(
  resourceId: string,
  type: ReportType,
  message: string | undefined,
  returnTo?: string,
): Promise<ReportActionResult> {
  // Same untrusted-input treatment as toggleBookmarkAction: a Server
  // Action is callable directly, so `returnTo` must be validated before
  // ever being used as a redirect target.
  const safeReturnTo = isSafeRelativePath(returnTo) ? returnTo : undefined;

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(safeReturnTo ?? "/")}`);
  }

  try {
    await submitReport({ id: session.user.id, role: session.user.role }, resourceId, type, message);
    if (safeReturnTo) revalidatePath(safeReturnTo);
    return { success: true, message: "شكرًا لك، تم إرسال بلاغك." };
  } catch (error) {
    return toResult(error);
  }
}

// ------------------------------------------------------------
// RESOLVE / DISMISS (admin)
// ------------------------------------------------------------

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/reports");
  }
  return session;
}

/**
 * NOTE (Batch 7B): used only by the two admin actions below —
 * deliberately separate from the unmodified `toResult` above (still
 * used by submitReportAction, which is explicitly out of Batch 7B
 * scope and left untouched). ValidationError's own `error.message` is
 * passed through unchanged, same disclosed exception as the other
 * Batch 6/7A/7B action files (message originates in the service
 * layer, outside this batch's scope).
 */
function toLocalizedResult(error: unknown, dict: Dictionary): ReportActionResult {
  if (error instanceof ForbiddenError) return { success: false, message: dict.adminDashboard.errorUnauthorizedShort };
  if (error instanceof NotFoundError) return { success: false, message: dict.adminDashboard.errorReportNotFound };
  if (error instanceof ValidationError) return { success: false, message: error.message };
  // eslint-disable-next-line no-console
  console.error("[report.actions] unexpected error:", error);
  return { success: false, message: dict.adminDashboard.errorUnexpectedNoRetry };
}

export async function resolveReportAction(
  reportId: string,
  note?: string,
): Promise<ReportActionResult> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());
  try {
    await resolveReport({ id: session.user.id, role: session.user.role }, reportId, note);
    revalidatePath("/admin/reports");
    return { success: true, message: dict.adminDashboard.successReportResolved };
  } catch (error) {
    return toLocalizedResult(error, dict);
  }
}

export async function dismissReportAction(
  reportId: string,
  note?: string,
): Promise<ReportActionResult> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());
  try {
    await dismissReport({ id: session.user.id, role: session.user.role }, reportId, note);
    revalidatePath("/admin/reports");
    return { success: true, message: dict.adminDashboard.successReportDismissed };
  } catch (error) {
    return toLocalizedResult(error, dict);
  }
}
