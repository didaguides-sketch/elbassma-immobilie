"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { ForbiddenError } from "@/server/auth/rbac";
import { submitReport, resolveReport, dismissReport } from "@/server/services/report.service";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import { isSafeRelativePath } from "@/lib/utils/safe-redirect";
import type { ReportType } from "@prisma/client";

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

export async function resolveReportAction(
  reportId: string,
  note?: string,
): Promise<ReportActionResult> {
  const session = await requireAdminSession();
  try {
    await resolveReport({ id: session.user.id, role: session.user.role }, reportId, note);
    revalidatePath("/admin/reports");
    return { success: true, message: "تم حل البلاغ." };
  } catch (error) {
    return toResult(error);
  }
}

export async function dismissReportAction(
  reportId: string,
  note?: string,
): Promise<ReportActionResult> {
  const session = await requireAdminSession();
  try {
    await dismissReport({ id: session.user.id, role: session.user.role }, reportId, note);
    revalidatePath("/admin/reports");
    return { success: true, message: "تم رفض البلاغ." };
  } catch (error) {
    return toResult(error);
  }
}
