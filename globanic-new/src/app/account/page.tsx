import { auth } from "@/server/auth/auth.config";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/server/services/notification.service";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function AccountPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, unreadCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true },
    }),
    getUnreadNotificationCount({ id: userId }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="mb-1 text-2xl font-bold text-globanic-navy">
          مرحبًا، {user.profile?.fullName ?? user.email}
        </h1>
        <p className="mb-6 text-sm text-gray-500">{user.email}</p>

        <dl className="mb-8 space-y-2 text-sm">
          <div className="flex justify-between border-b border-gray-100 py-2">
            <dt className="text-gray-500">الدور</dt>
            <dd className="font-medium">{user.role}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-2">
            <dt className="text-gray-500">الحالة</dt>
            <dd className="font-medium">{user.status}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-2">
            <dt className="text-gray-500">عضو منذ</dt>
            <dd className="font-medium">
              {new Intl.DateTimeFormat("fr-FR").format(user.createdAt)}
            </dd>
          </div>
        </dl>

        <a
          href="/notifications"
          className="mb-4 block rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-globanic-navy hover:bg-gray-50"
        >
          الإشعارات{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </a>

        <a
          href="/account/favorites"
          className="mb-4 block rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-globanic-navy hover:bg-gray-50"
        >
          الموارد المحفوظة
        </a>

        <a
          href="/account/following"
          className="mb-4 block rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-globanic-navy hover:bg-gray-50"
        >
          الباحثون المتابَعون
        </a>

        {user.role === "USER" && (
          <a
            href="/publisher/apply"
            className="mb-4 block rounded-lg bg-globanic-blue px-4 py-2.5 text-center text-sm font-semibold text-white"
          >
            التقديم كناشر (Publisher)
          </a>
        )}

        <LogoutButton />
      </div>
    </main>
  );
}
