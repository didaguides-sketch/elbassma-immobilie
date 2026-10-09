import type { Metadata } from "next";
import type { ReportStatus, ReportType } from "@prisma/client";
import { auth } from "@/server/auth/auth";
import { listReportsForAdmin } from "@/server/services/report.service";
import { ReportStatusBadge } from "@/components/reports/ReportStatusBadge";
import { AdminReportActions } from "@/components/reports/AdminReportActions";
import { resourceTypeToUrlSegment } from "@/lib/utils/resource-type";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.reportsPageTitle };
}

function buildStatusFilters(dict: Dictionary): { value: ReportStatus | "ALL"; label: string }[] {
  return [
    { value: "ALL", label: dict.adminDashboard.filterAll },
    { value: "OPEN", label: dict.adminDashboard.reportFilterOpen },
    { value: "RESOLVED", label: dict.adminDashboard.reportFilterResolved },
    { value: "DISMISSED", label: dict.adminDashboard.filterRejected },
  ];
}

// report-labels.ts's REPORT_TYPE_LABELS is intentionally NOT imported
// here — per the comment already left in ReportResourceForm.tsx (Batch
// 5, frozen), that map was deliberately kept as dead-code-for-display
// specifically so the Admin batch could take over the display text
// without touching a frozen student-facing file. This page reuses the
// same `resource.reportTypeX` dictionary keys ReportResourceForm.tsx
// already established, via the same per-ReportType key mapping.
const REPORT_TYPE_DICT_KEYS: Record<ReportType, keyof Dictionary["resource"]> = {
  COPYRIGHT: "reportTypeCopyright",
  SPAM: "reportTypeSpam",
  INCORRECT_INFO: "reportTypeIncorrectInfo",
  BROKEN_FILE: "reportTypeBrokenFile",
  INAPPROPRIATE: "reportTypeInappropriate",
  OTHER: "reportTypeOther",
};

export default async function AdminReportsPage({
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
    ? (searchParams.status as ReportStatus | "ALL")
    : "ALL";

  const reports = await listReportsForAdmin(
    actor,
    activeStatus === "ALL" ? undefined : activeStatus,
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.reportsPageTitle}</h1>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {STATUS_FILTERS.map((s) => (
          <a
            key={s.value}
            href={s.value === "ALL" ? "/admin/reports" : `/admin/reports?status=${s.value}`}
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

      {reports.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
          {dict.adminDashboard.noReportsInSectionMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="rounded border border-slate-200 p-5 ">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <a
                    href={`/resources/${resourceTypeToUrlSegment(r.resource.type)}/${r.resource.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-globanic-navy hover:underline"
                  >
                    {r.resource.title}
                  </a>
                  <p className="text-caption text-slate-500">
                    {dict.resource[REPORT_TYPE_DICT_KEYS[r.type]]} ·{" "}
                    {r.reportedBy ? r.reportedBy.email : dict.adminDashboard.deletedUserFallback} ·{" "}
                    {formatDate(r.createdAt, locale)}
                  </p>
                </div>
                <ReportStatusBadge status={r.status} />
              </div>

              {r.message && (
                <p className="mb-3 rounded bg-slate-50 p-3 text-body-sm text-slate-700">{r.message}</p>
              )}

              <AdminReportActions reportId={r.id} status={r.status} />
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-caption text-slate-400">
        {dict.adminDashboard.reportsPaginationNote}
      </p>
    </main>
  );
}
