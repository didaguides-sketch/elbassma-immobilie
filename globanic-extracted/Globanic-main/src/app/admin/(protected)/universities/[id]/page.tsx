import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { getUniversityForAdmin } from "@/server/services/university-admin.service";
import { NotFoundError } from "@/server/services/resource.service";
import { updateUniversityAction, deleteUniversityAction } from "@/server/actions/admin-university.actions";
import { UniversityForm } from "@/components/admin/UniversityForm";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.editUniversityPageTitle };
}

export default async function EditUniversityPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(await getLocale());
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
        <h1 className="text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.editUniversityPageTitle}</h1>
        <DeleteEntityButton
          onDelete={() => deleteUniversityAction(university.id)}
          confirmMessage={dict.adminDashboard.deleteEntityConfirm.replace("{name}", university.name)}
          redirectTo="/admin/universities"
        />
      </div>
      <div className="rounded border border-slate-200 bg-white p-6 ">
        <p className="mb-4 text-caption text-slate-400">
          {dict.adminDashboard.slugNoteLabel} <code className="text-slate-600">{university.slug}</code>{" "}
          {dict.adminDashboard.slugNoteSuffix}
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
          submitLabel={dict.adminDashboard.saveChangesSubmitLabel}
        />
      </div>
    </main>
  );
}
