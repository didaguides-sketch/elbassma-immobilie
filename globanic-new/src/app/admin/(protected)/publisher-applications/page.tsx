import type { Metadata } from "next";
import { auth } from "@/server/auth/auth.config";
import {
  listApplicationsForAdmin,
  type AdminApplicationTab,
} from "@/server/services/publisher-application.service";
import { PublisherApplicationStatusBadge } from "@/components/publisher/PublisherApplicationStatusBadge";
import { AdminPublisherApplicationActions } from "@/components/publisher/AdminPublisherApplicationActions";

export const metadata: Metadata = { title: "طلبات الناشرين" };

const TABS: { key: AdminApplicationTab; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "قيد الانتظار" },
  { key: "verified", label: "موثّقة" },
  { key: "rejected", label: "مرفوضة" },
  { key: "suspended", label: "معلَّقة" },
];

export default async function AdminPublisherApplicationsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const activeTab = (TABS.some((t) => t.key === searchParams.tab) ? searchParams.tab : "all") as AdminApplicationTab;

  const applications = await listApplicationsForAdmin(actor, activeTab);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">طلبات الناشرين</h1>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {TABS.map((tab) => (
          <a
            key={tab.key}
            href={tab.key === "all" ? "/admin/publisher-applications" : `/admin/publisher-applications?tab=${tab.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-globanic-navy text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد طلبات في هذا القسم حاليًا.
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-globanic-navy">{app.fullName}</h2>
                  <p className="text-xs text-gray-500">
                    {app.user.email} · {app.academicStatus}
                    {app.university && ` · ${app.university.name}`}
                    {app.specialty && ` · ${app.specialty.name}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {app.academicEmail} ·{" "}
                    {new Intl.DateTimeFormat("fr-FR").format(app.createdAt)}
                  </p>
                </div>
                <PublisherApplicationStatusBadge status={app.status} />
              </div>

              {app.additionalInfo && (
                <p className="mb-3 text-sm text-gray-600">{app.additionalInfo}</p>
              )}

              {app.rejectionReason && (
                <p className="mb-3 text-sm text-red-700">ملاحظة: {app.rejectionReason}</p>
              )}

              <div className="mb-3">
                <a
                  href={`/api/publisher-applications/${app.id}/proof`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-globanic-blue hover:underline"
                >
                  عرض مستند الإثبات
                </a>
              </div>

              <AdminPublisherApplicationActions
                applicationId={app.id}
                targetUserId={app.user.id}
                status={app.status}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
