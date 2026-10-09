import type { Metadata } from "next";
import { UniversityForm } from "@/components/admin/UniversityForm";
import { createUniversityAction } from "@/server/actions/admin-university.actions";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.newUniversityPageTitle };
}

export default async function NewUniversityPage() {
  const dict = await getDictionary(await getLocale());
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.newUniversityPageTitle}</h1>
      <div className="rounded border border-slate-200 bg-white p-6 ">
        <UniversityForm
          action={createUniversityAction}
          submitLabel={dict.adminDashboard.createUniversitySubmitLabel}
          redirectOnSuccess="/admin/universities"
        />
      </div>
    </main>
  );
}
