import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { getUniversityForAdmin } from "@/server/services/university-admin.service";
import { NotFoundError } from "@/server/services/resource.service";
import { updateUniversityAction, deleteUniversityAction } from "@/server/actions/admin-university.actions";
import { UniversityForm } from "@/components/admin/UniversityForm";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";

export const metadata: Metadata = { title: "تعديل الجامعة" };

export default async function EditUniversityPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  let university;
  try {
    university = await getUniversityForAdmin(actor, params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const boundUpdateAction = updateUniversityAction.bind(null, university.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-globanic-navy">تعديل الجامعة</h1>
        <DeleteEntityButton
          onDelete={() => deleteUniversityAction(university.id)}
          confirmMessage={`هل أنت متأكد من حذف "${university.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
          redirectTo="/admin/universities"
        />
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs text-gray-400">
          الرابط الدائم (Slug): <code className="text-gray-600">{university.slug}</code> — لا يتغيّر
          عند تعديل الاسم.
        </p>
        <UniversityForm
          action={boundUpdateAction}
          defaults={{
            name: university.name,
            city: university.city,
            country: university.country,
            logoUrl: university.logoUrl,
            officialWebsite: university.officialWebsite,
          }}
          submitLabel="حفظ التعديلات"
        />
      </div>
    </main>
  );
}
