import type { Metadata } from "next";
import { auth } from "@/server/auth/auth";
import {
  listApplicationsForAdmin,
  type AdminApplicationTab,
} from "@/server/services/publisher-application.service";
import { PublisherApplicationStatusBadge } from "@/components/publisher/PublisherApplicationStatusBadge";
import { AdminPublisherApplicationActions } from "@/components/publisher/AdminPublisherApplicationActions";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.publisherApplicationsPageTitle };
}

function buildTabs(dict: Dictionary): { key: AdminApplicationTab; label: string }[] {
  return [
    { key: "all", label: dict.adminDashboard.filterAll },
    { key: "pending", label: dict.adminDashboard.filterPending },
    { key: "verified", label: dict.adminDashboard.applicationFilterVerified },
    { key: "rejected", label: dict.adminDashboard.filterRejected },
    { key: "suspended", label: dict.adminDashboard.applicationFilterSuspended },
  ];
}

export default async function AdminPublisherApplicationsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const TABS = buildTabs(dict);

  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const activeTab = (TABS.some((t) => t.key === searchParams.tab) ? searchParams.tab : "all") as AdminApplicationTab;

  const applications = await listApplicationsForAdmin(actor, activeTab);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.publisherApplicationsPageTitle}</h1>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((tab) => (
          <a
            key={tab.key}
            href={tab.key === "all" ? "/admin/publisher-applications" : `/admin/publisher-applications?tab=${tab.key}`}
            className={`rounded-full px-4 py-1.5 text-body-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-globanic-navy text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      {applications.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
          {dict.adminDashboard.noApplicationsInSectionMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="rounded border border-slate-200 p-5 ">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-globanic-navy">{app.fullName}</h2>
                  <p className="text-caption text-slate-500">
                    {app.user.email} · {app.academicStatus}
                    {app.university && ` · ${app.university.name}`}
                    {app.specialty && ` · ${app.specialty.name}`}
                  </p>
                  <p className="text-caption text-slate-400">
                    {app.academicEmail} ·{" "}
                    {formatDate(app.createdAt, locale)}
                  </p>
                </div>
                <PublisherApplicationStatusBadge status={app.status} />
              </div>

              {app.additionalInfo && (
                <p className="mb-3 text-body-sm text-slate-600">{app.additionalInfo}</p>
              )}

              {app.rejectionReason && (
                <p className="mb-3 text-body-sm text-red-700">
                  {dict.adminDashboard.rejectionNoteLabel} {app.rejectionReason}
                </p>
              )}

              <div className="mb-3">
                <a
                  href={`/api/publisher-applications/${app.id}/proof`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-body-sm font-semibold text-globanic-blue hover:underline"
                >
                  {dict.adminDashboard.viewProofDocumentLink}
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
