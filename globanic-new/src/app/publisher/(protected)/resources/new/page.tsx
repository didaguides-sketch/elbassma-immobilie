import type { Metadata } from "next";
import { createResourceAction } from "@/server/actions/resource.actions";
import { listDomainsWithSpecialties, listUniversitiesWithFaculties } from "@/server/services/taxonomy.service";
import { ResourceForm } from "@/components/resources/ResourceForm";

export const metadata: Metadata = { title: "إنشاء مورد جديد" };

export default async function NewResourcePage() {
  const [domains, universities] = await Promise.all([
    listDomainsWithSpecialties(),
    listUniversitiesWithFaculties(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-globanic-navy">إنشاء مورد جديد</h1>
      <p className="mb-8 text-sm text-gray-500">
        سيتم إنشاء المورد كمسودة (Draft). يمكنك تعديله ثم إرساله للمراجعة لاحقًا.
      </p>

      {domains.length === 0 && (
        <div className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          لا توجد مجالات (Domains) في قاعدة البيانات بعد. يجب على الإدارة إضافة مجال واحد على
          الأقل من <code>/admin/domains</code> قبل أن يتمكن الناشرون من إنشاء موارد.
        </div>
      )}

      <ResourceForm
        action={createResourceAction}
        domains={domains}
        universities={universities}
        submitLabel="حفظ كمسودة"
      />
    </main>
  );
}
