import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { getUserDetail } from "@/server/services/user-admin.service";
import { NotFoundError } from "@/server/services/resource.service";
import { UserAdminActions } from "@/components/admin/UserAdminActions";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.userDetailPageTitle };
}

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
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
      <div className="rounded border border-slate-200 bg-white p-6 ">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-h3 font-semibold text-globanic-navy">
              {user.profile?.fullName ?? user.email}
            </h1>
            <p className="text-body-sm text-slate-500">{user.email}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-caption font-semibold ${
              user.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"
            }`}
          >
            {user.status === "ACTIVE"
              ? dict.adminDashboard.statusActiveLabel
              : user.status === "SUSPENDED"
                ? dict.adminDashboard.statusSuspendedLabel
                : dict.adminDashboard.statusDeletedLabel}
          </span>
        </div>

        <dl className="mb-6 space-y-2 text-body-sm">
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">{dict.adminDashboard.roleLabel}</dt>
            <dd className="font-medium">{user.role}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">{dict.adminDashboard.memberSinceLabel}</dt>
            <dd className="font-medium">{formatDate(user.createdAt, locale)}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">{dict.adminDashboard.uploadedResourcesLabel}</dt>
            <dd className="font-medium">{user._count.resourcesUploaded}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">{dict.adminDashboard.publisherApplicationsSubmittedLabel}</dt>
            <dd className="font-medium">{user._count.publisherApplications}</dd>
          </div>
        </dl>

        {isSelf ? (
          <p className="rounded bg-slate-50 p-3 text-body-sm text-slate-500">
            {dict.adminDashboard.cannotActOnOwnAccountMessage}
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
