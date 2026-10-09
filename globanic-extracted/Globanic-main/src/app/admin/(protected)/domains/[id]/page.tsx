import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { getDomainForAdmin } from "@/server/services/domain-admin.service";
import { NotFoundError } from "@/server/services/resource.service";
import { updateDomainAction, deleteDomainAction } from "@/server/actions/admin-domain.actions";
import { DomainForm } from "@/components/admin/DomainForm";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.editDomainPageTitle };
}

export default async function EditDomainPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(await getLocale());
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
        <h1 className="text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.editDomainPageTitle}</h1>
        <DeleteEntityButton
          onDelete={() => deleteDomainAction(domain.id)}
          confirmMessage={dict.adminDashboard.deleteEntityConfirm.replace("{name}", domain.name)}
          redirectTo="/admin/domains"
        />
      </div>
      <div className="rounded border border-slate-200 bg-white p-6 ">
        <p className="mb-4 text-caption text-slate-400">
          {dict.adminDashboard.slugNoteLabel} <code className="text-slate-600">{domain.slug}</code>{" "}
          {dict.adminDashboard.slugNoteSuffix}
        </p>
        <DomainForm
          action={boundUpdateAction}
          defaults={{ name: domain.name, icon: domain.icon, order: domain.order }}
          submitLabel={dict.adminDashboard.saveChangesSubmitLabel}
        />
      </div>
    </main>
  );
}
