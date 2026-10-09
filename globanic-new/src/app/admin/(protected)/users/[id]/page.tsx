import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { getUserDetail } from "@/server/services/user-admin.service";
import { NotFoundError } from "@/server/services/resource.service";
import { UserAdminActions } from "@/components/admin/UserAdminActions";

export const metadata: Metadata = { title: "تفاصيل المستخدم" };

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  let user;
  try {
    user = await getUserDetail(actor, params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const isSelf = user.id === actor.id;
  const canChangeRole = actor.role === "SUPER_ADMIN";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-globanic-navy">
              {user.profile?.fullName ?? user.email}
            </h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              user.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
            }`}
          >
            {user.status === "ACTIVE" ? "نشط" : user.status === "SUSPENDED" ? "معلَّق" : "محذوف"}
          </span>
        </div>

        <dl className="mb-6 space-y-2 text-sm">
          <div className="flex justify-between border-b border-gray-50 py-2">
            <dt className="text-gray-500">الدور</dt>
            <dd className="font-medium">{user.role}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-50 py-2">
            <dt className="text-gray-500">عضو منذ</dt>
            <dd className="font-medium">{new Intl.DateTimeFormat("fr-FR").format(user.createdAt)}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-50 py-2">
            <dt className="text-gray-500">الموارد المرفوعة</dt>
            <dd className="font-medium">{user._count.resourcesUploaded}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-50 py-2">
            <dt className="text-gray-500">طلبات النشر المُقدَّمة</dt>
            <dd className="font-medium">{user._count.publisherApplications}</dd>
          </div>
        </dl>

        {isSelf ? (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
            لا يمكنك تنفيذ إجراءات إدارية على حسابك الخاص.
          </p>
        ) : (
          <UserAdminActions
            targetUserId={user.id}
            status={user.status}
            role={user.role}
            canChangeRole={canChangeRole}
          />
        )}
      </div>
    </main>
  );
}
