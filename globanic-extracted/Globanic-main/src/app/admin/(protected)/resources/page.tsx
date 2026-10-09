import type { Metadata } from "next";
import type { ResourceStatus } from "@prisma/client";
import { auth } from "@/server/auth/auth";
import { listResourcesForAdmin } from "@/server/services/resource.service";
import { ResourceStatusBadge } from "@/components/resources/ResourceStatusBadge";
import { AdminResourceActions } from "@/components/resources/AdminResourceActions";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.adminResourcesPageTitle };
}

function buildStatusFilters(dict: Dictionary): { value: ResourceStatus | "ALL"; label: string }[] {
  return [
    { value: "ALL", label: dict.adminDashboard.filterAll },
    { value: "SUBMITTED", label: dict.adminDashboard.filterPending },
    { value: "UNDER_REVIEW", label: dict.adminDashboard.filterUnderReview },
    { value: "PUBLISHED", label: dict.adminDashboard.filterPublished },
    { value: "REJECTED", label: dict.adminDashboard.filterRejected },
    { value: "CHANGES_REQUESTED", label: dict.adminDashboard.filterChangesRequested },
    { value: "UNPUBLISHED", label: dict.adminDashboard.filterUnpublished },
    { value: "DRAFT", label: dict.adminDashboard.filterDraft },
  ];
}

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const STATUS_FILTERS = buildStatusFilters(dict);

  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const activeStatus = STATUS_FILTERS.some((s) => s.value === searchParams.status)
    ? (searchParams.status as ResourceStatus | "ALL")
    : "ALL";

  const resources = await listResourcesForAdmin(
    actor,
    activeStatus === "ALL" ? undefined : activeStatus,
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.adminResourcesPageTitle}</h1>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {STATUS_FILTERS.map((s) => (
          <a
            key={s.value}
            href={s.value === "ALL" ? "/admin/resources" : `/admin/resources?status=${s.value}`}
            className={`rounded-full px-4 py-1.5 text-body-sm font-medium transition ${
              activeStatus === s.value
                ? "bg-globanic-navy text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.label}
          </a>
        ))}
      </nav>

      {resources.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
          {dict.adminDashboard.noResourcesInSectionMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {resources.map((r) => (
            <div key={r.id} className="rounded border border-slate-200 p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-globanic-navy">{r.title}</h2>
                  <p className="text-caption text-slate-500">
                    {dict.resourceType[r.type]} · {r.uploadedBy.email} ·{" "}
                    {formatDate(r.createdAt, locale)}
                  </p>
                </div>
                <ResourceStatusBadge status={r.status} />
              </div>
              <AdminResourceActions resourceId={r.id} status={r.status} />
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-caption text-slate-400">
        {dict.adminDashboard.resourcesPaginationNote}
      </p>
    </main>
  );
}
