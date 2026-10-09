"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { ForbiddenError } from "@/server/auth/rbac";
import { NotFoundError } from "@/server/services/resource.service";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/server/services/notification.service";

export type NotificationActionResult = { success: boolean; message?: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/notifications");
  return session;
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  const session = await requireSession();
  try {
    await markNotificationAsRead({ id: session.user.id }, notificationId);
    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    if (error instanceof ForbiddenError) return { success: false, message: "غير مصرح لك." };
    if (error instanceof NotFoundError) return { success: false, message: "الإشعار غير موجود." };
    // eslint-disable-next-line no-console
    console.error("[notification.actions] unexpected error:", error);
    return { success: false, message: "حدث خطأ غير متوقع." };
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const session = await requireSession();
  await markAllNotificationsAsRead({ id: session.user.id });
  revalidatePath("/notifications");
  return { success: true };
}
