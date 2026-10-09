import type { Metadata } from "next";
import type { ResourceStatus } from "@prisma/client";
import { auth } from "@/server/auth/auth.config";
import { listResourcesForAdmin } from "@/server/services/resource.service";
import { ResourceStatusBadge } from "@/components/resources/ResourceStatusBadge";
import { AdminResourceActions } from "@/components/resources/AdminResourceActions";

export const metadata: Metadata = { title: "إدارة الموارد" };

const STATUS_FILTERS: { value: ResourceStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "الكل" },
  { value: "SUBMITTED", label: "قيد الانتظار" },
  { value: "UNDER_REVIEW", label: "قيد المراجعة" },
  { value: "PUBLISHED", label: "منشورة" },
  { value: "REJECTED", label: "مرفوضة" },
  { value: "CHANGES_REQUESTED", label: "تعديلات مطلوبة" },
  { value: "UNPUBLISHED", label: "غير منشورة" },
  { value: "DRAFT", label: "مسودات" },
];

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
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
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">إدارة الموارد</h1>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {STATUS_FILTERS.map((s) => (
          <a
            key={s.value}
            href={s.value === "ALL" ? "/admin/resources" : `/admin/resources?status=${s.value}`}
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

      {resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد موارد في هذا القسم حاليًا.
        </div>
      ) : (
        <div className="space-y-4">
          {resources.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-globanic-navy">{r.title}</h2>
                  <p className="text-xs text-gray-500">
                    {r.type} · {r.uploadedBy.email} ·{" "}
                    {new Intl.DateTimeFormat("fr-FR").format(r.createdAt)}
                  </p>
                </div>
                <ResourceStatusBadge status={r.status} />
              </div>
              <AdminResourceActions resourceId={r.id} status={r.status} />
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-gray-400">
        عرض أول 50 مورد لكل فلتر — الترقيم بين الصفحات (Pagination) وفلاتر البحث المتقدمة
        ستُبنى لاحقًا مع باقي واجهة /admin/resources.
      </p>
    </main>
  );
}
