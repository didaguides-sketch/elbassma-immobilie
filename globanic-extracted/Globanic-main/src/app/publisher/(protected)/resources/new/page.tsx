import type { Metadata } from "next";
import { createResourceAction } from "@/server/actions/resource.actions";
import { listDomainsWithSpecialties, listUniversitiesWithFaculties } from "@/server/services/taxonomy.service";
import { ResourceForm } from "@/components/resources/ResourceForm";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.publisherDashboard.newResourcePageTitle };
}

export default async function NewResourcePage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const [domains, universities] = await Promise.all([
    listDomainsWithSpecialties(),
    listUniversitiesWithFaculties(),
  ]);

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 font-serif text-h1 font-semibold text-globanic-navy">
          {dict.publisherDashboard.newResourcePageTitle}
        </h1>
        <p className="mb-8 text-body-sm text-slate-500">
          {dict.publisherDashboard.newResourceIntro}
        </p>

        {domains.length === 0 && (
          <div className="mb-6 rounded border border-amber-200 bg-amber-50 p-4 text-body-sm text-amber-800">
            {dict.publisherDashboard.noDomainsWarningPrefix} <code>/admin/domains</code>{" "}
            {dict.publisherDashboard.noDomainsWarningSuffix}
          </div>
        )}

        <ResourceForm
          action={createResourceAction}
          domains={domains}
          universities={universities}
          submitLabel={dict.publisherDashboard.createSubmitLabel}
        />
      </div>
    </main>
  );
}
