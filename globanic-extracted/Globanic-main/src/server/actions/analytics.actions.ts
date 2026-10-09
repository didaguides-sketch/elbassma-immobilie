"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { toggleResourceBookmark } from "@/server/services/analytics-tracking.service";
import { NotFoundError } from "@/server/services/resource.service";
import { isSafeRelativePath } from "@/lib/utils/safe-redirect";

export type ToggleBookmarkResult = { success: boolean; bookmarked?: boolean; message?: string };

export async function toggleBookmarkAction(
  resourceId: string,
  returnTo?: string,
): Promise<ToggleBookmarkResult> {
  // Server Actions are callable directly (not just from our own UI), so
  // `returnTo` must be treated as untrusted input regardless of what the
  // legitimate button component happens to pass — never build a redirect
  // target from it without validating first.
  const safeReturnTo = isSafeRelativePath(returnTo) ? returnTo : undefined;
  const fallbackPath = `/publisher/resources/${resourceId}`;

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(safeReturnTo ?? fallbackPath)}`);
  }

  try {
    const result = await toggleResourceBookmark({ id: session.user.id }, resourceId);
    revalidatePath(fallbackPath);
    if (safeReturnTo) revalidatePath(safeReturnTo);
    return { success: true, bookmarked: result.bookmarked };
  } catch (error) {
    if (error instanceof NotFoundError) return { success: false, message: "المورد غير موجود." };
    // eslint-disable-next-line no-console
    console.error("[analytics.actions] unexpected error:", error);
    return { success: false, message: "حدث خطأ غير متوقع." };
  }
}
