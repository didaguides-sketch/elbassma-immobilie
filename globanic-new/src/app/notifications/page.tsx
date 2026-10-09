import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { listMyNotifications } from "@/server/services/notification.service";
import { markAllNotificationsReadAction } from "@/server/actions/notification.actions";
import { MarkReadButton } from "@/components/notifications/MarkReadButton";

export const metadata: Metadata = { title: "الإشعارات" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/notifications");
  }

  const notifications = await listMyNotifications({ id: session.user.id });
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-globanic-navy">الإشعارات</h1>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <button
              type="submit"
              className="text-sm font-semibold text-globanic-blue hover:underline"
            >
              تعليم الكل كمقروء
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد إشعارات حتى الآن.
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 ${
                n.read ? "border-gray-100 bg-white" : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="mb-1 flex items-start justify-between gap-3">
                <h2 className="font-semibold text-globanic-navy">{n.title}</h2>
                {!n.read && <MarkReadButton notificationId={n.id} />}
              </div>
              <p className="mb-2 text-sm text-gray-600">{n.message}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{new Intl.DateTimeFormat("fr-FR").format(n.createdAt)}</span>
                {n.link && (
                  <a href={n.link} className="font-semibold text-globanic-blue hover:underline">
                    عرض
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
