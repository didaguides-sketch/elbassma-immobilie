import type { Metadata } from "next";
import Link from "next/link";
import { listDomainsWithResourceCounts } from "@/server/services/public-directory.service";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    title: dict.nav.domains,
    description: dict.domain.listMetaDescription,
    path: "/domains",
  });
}

export default async function DomainsPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const domains = await listDomainsWithResourceCounts();

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 text-h2 font-semibold text-globanic-navy">{dict.domain.exploreHeading}</h1>

      {domains.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-body-sm text-slate-500">
          {dict.domain.noDomainsRegistered}
        </div>
      ) : (
        <ul className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2">
          {domains.map((d) => (
            <li key={d.id} className="border-slate-100 sm:odd:border-e">
              <Link href={`/domains/${d.slug}`} className="flex items-center justify-between py-4 hover:bg-slate-50">
                <span className="font-medium text-globanic-navy">{d.name}</span>
                <span className="text-body-sm text-slate-400">
                  {d._count.resources} {dict.search.resourceCountSuffix}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
