import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { getDomainForAdmin } from "@/server/services/domain-admin.service";
import { NotFoundError } from "@/server/services/resource.service";
import { updateDomainAction, deleteDomainAction } from "@/server/actions/admin-domain.actions";
import { DomainForm } from "@/components/admin/DomainForm";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";

export const metadata: Metadata = { title: "تعديل المجال" };

export default async function EditDomainPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  let domain;
  try {
    domain = await getDomainForAdmin(actor, params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const boundUpdateAction = updateDomainAction.bind(null, domain.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-globanic-navy">تعديل المجال</h1>
        <DeleteEntityButton
          onDelete={() => deleteDomainAction(domain.id)}
          confirmMessage={`هل أنت متأكد من حذف "${domain.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
          redirectTo="/admin/domains"
        />
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs text-gray-400">
          الرابط الدائم (Slug): <code className="text-gray-600">{domain.slug}</code> — لا يتغيّر عند
          تعديل الاسم.
        </p>
        <DomainForm
          action={boundUpdateAction}
          defaults={{ name: domain.name, icon: domain.icon, order: domain.order }}
          submitLabel="حفظ التعديلات"
        />
      </div>
    </main>
  );
}
