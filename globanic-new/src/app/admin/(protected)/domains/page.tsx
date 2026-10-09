import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/server/auth/auth.config";
import { listDomainsForAdmin } from "@/server/services/domain-admin.service";
import { deleteDomainAction } from "@/server/actions/admin-domain.actions";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";

export const metadata: Metadata = { title: "إدارة المجالات" };

export default async function AdminDomainsPage() {
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const domains = await listDomainsForAdmin(actor);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-globanic-navy">إدارة المجالات</h1>
        <Link
          href="/admin/domains/new"
          className="rounded-lg bg-globanic-blue px-4 py-2 text-sm font-semibold text-white hover:bg-globanic-blueLight"
        >
          + مجال جديد
        </Link>
      </div>

      {domains.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد مجالات مسجّلة حاليًا.
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4 shadow-sm"
            >
              <div>
                <Link
                  href={`/admin/domains/${d.id}`}
                  className="font-semibold text-globanic-navy hover:underline"
                >
                  {d.icon ? `${d.icon} ` : ""}
                  {d.name}
                </Link>
                <p className="text-xs text-gray-500">
                  الترتيب: {d.order} · {d._count.resources} مورد · {d._count.specialties} تخصص
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/domains/${d.id}`}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  تعديل
                </Link>
                <DeleteEntityButton
                  onDelete={() => deleteDomainAction(d.id)}
                  confirmMessage={`هل أنت متأكد من حذف "${d.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
