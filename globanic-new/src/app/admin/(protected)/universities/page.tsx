import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/server/auth/auth.config";
import { listUniversitiesForAdmin } from "@/server/services/university-admin.service";
import { deleteUniversityAction } from "@/server/actions/admin-university.actions";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";

export const metadata: Metadata = { title: "إدارة الجامعات" };

export default async function AdminUniversitiesPage() {
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const universities = await listUniversitiesForAdmin(actor);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-globanic-navy">إدارة الجامعات</h1>
        <Link
          href="/admin/universities/new"
          className="rounded-lg bg-globanic-blue px-4 py-2 text-sm font-semibold text-white hover:bg-globanic-blueLight"
        >
          + جامعة جديدة
        </Link>
      </div>

      {universities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد جامعات مسجّلة حاليًا.
        </div>
      ) : (
        <div className="space-y-3">
          {universities.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4 shadow-sm"
            >
              <div>
                <Link
                  href={`/admin/universities/${u.id}`}
                  className="font-semibold text-globanic-navy hover:underline"
                >
                  {u.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {[u.city, u.country].filter(Boolean).join("، ") || "—"} · {u._count.resources} مورد
                  · {u._count.faculties} كلية · {u._count.authors} باحث
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/universities/${u.id}`}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  تعديل
                </Link>
                <DeleteEntityButton
                  onDelete={() => deleteUniversityAction(u.id)}
                  confirmMessage={`هل أنت متأكد من حذف "${u.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
