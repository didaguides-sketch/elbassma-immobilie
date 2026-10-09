import type { Metadata } from "next";
import type { ReportStatus } from "@prisma/client";
import { auth } from "@/server/auth/auth.config";
import { listReportsForAdmin } from "@/server/services/report.service";
import { ReportStatusBadge } from "@/components/reports/ReportStatusBadge";
import { AdminReportActions } from "@/components/reports/AdminReportActions";
import { REPORT_TYPE_LABELS } from "@/lib/utils/report-labels";
import { resourceTypeToUrlSegment } from "@/lib/utils/resource-type";

export const metadata: Metadata = { title: "البلاغات" };

const STATUS_FILTERS: { value: ReportStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "الكل" },
  { value: "OPEN", label: "مفتوحة" },
  { value: "RESOLVED", label: "تم حلها" },
  { value: "DISMISSED", label: "مرفوضة" },
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
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
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">البلاغات</h1>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {STATUS_FILTERS.map((s) => (
          <a
            key={s.value}
            href={s.value === "ALL" ? "/admin/reports" : `/admin/reports?status=${s.value}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeStatus === s.value
                ? "bg-globanic-navy text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s.label}
          </a>
        ))}
      </nav>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد بلاغات في هذا القسم حاليًا.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-100 p-5 shadow-sm">
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
                  <p className="text-xs text-gray-500">
                    {REPORT_TYPE_LABELS[r.type]} ·{" "}
                    {r.reportedBy ? r.reportedBy.email : "مستخدم محذوف"} ·{" "}
                    {new Intl.DateTimeFormat("fr-FR").format(r.createdAt)}
                  </p>
                </div>
                <ReportStatusBadge status={r.status} />
              </div>

              {r.message && (
                <p className="mb-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{r.message}</p>
              )}

              <AdminReportActions reportId={r.id} status={r.status} />
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-gray-400">
        عرض أحدث 50 بلاغًا لكل فلتر — الترقيم بين الصفحات (Pagination) وفلاتر البحث المتقدمة
        ستُبنى لاحقًا مع باقي واجهة /admin.
      </p>
    </main>
  );
}
