import type { Metadata } from "next";
import { DomainForm } from "@/components/admin/DomainForm";
import { createDomainAction } from "@/server/actions/admin-domain.actions";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.newDomainPageTitle };
}

export default async function NewDomainPage() {
  const dict = await getDictionary(await getLocale());
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.newDomainPageTitle}</h1>
      <div className="rounded border border-slate-200 bg-white p-6 ">
        <DomainForm
          action={createDomainAction}
          submitLabel={dict.adminDashboard.createDomainSubmitLabel}
          redirectOnSuccess="/admin/domains"
        />
      </div>
    </main>
  );
}
