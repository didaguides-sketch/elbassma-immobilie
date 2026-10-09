"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { setAuthorFollowState } from "@/server/services/follow.service";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import { isSafeRelativePath } from "@/lib/utils/safe-redirect";

export type FollowActionResult = { success: boolean; following?: boolean; message?: string };

export async function setFollowAction(
  authorId: string,
  follow: boolean,
  returnTo?: string,
): Promise<FollowActionResult> {
  const safeReturnTo = isSafeRelativePath(returnTo) ? returnTo : undefined;

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(safeReturnTo ?? "/authors")}`);
  }

  try {
    const result = await setAuthorFollowState({ id: session.user.id }, authorId, follow);
    if (safeReturnTo) revalidatePath(safeReturnTo);
    return { success: true, following: result.following };
  } catch (error) {
    if (error instanceof NotFoundError) return { success: false, message: "المؤلف غير موجود." };
    if (error instanceof ValidationError) return { success: false, message: error.message };
    // eslint-disable-next-line no-console
    console.error("[follow.actions] unexpected error:", error);
    return { success: false, message: "حدث خطأ غير متوقع." };
  }
}
