import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedResources } from "@/server/services/public-resource.service";
import { listDomainsWithSpecialties } from "@/server/services/taxonomy.service";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const PAGE_SIZE = 20;

type PageSearchParams = { page?: string; domain?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: PageSearchParams;
}): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    title: dict.search.allResourcesTitle,
    description: dict.search.allResourcesDescription,
    path: "/resources",
    searchParams,
    allowedParams: ["page", "domain"],
  });
}

export default async function ResourcesListPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const page = parsePage(searchParams.page);
  const domainSlug = searchParams.domain || undefined;
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const [{ resources, hasMore }, domains] = await Promise.all([
    listPublishedResources({ domainSlug, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    listDomainsWithSpecialties(),
  ]);

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 text-h2 font-semibold text-globanic-navy">{dict.search.allResourcesTitle}</h1>

      <nav aria-label={dict.search.filterByDomain} role="tablist" className="mb-8 flex flex-wrap gap-1 overflow-x-auto border-b border-slate-100">
        <Link
          href="/resources"
          role="tab"
          aria-selected={!domainSlug}
          className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-body-sm font-medium transition-colors ${
            !domainSlug ? "border-globanic-blue text-globanic-navy" : "border-transparent text-slate-500 hover:text-globanic-navy"
          }`}
        >
          {dict.search.allDomains}
        </Link>
        {domains.map((d) => (
          <Link
            key={d.id}
            href={`/resources?domain=${d.slug}`}
            role="tab"
            aria-selected={domainSlug === d.slug}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-body-sm font-medium transition-colors ${
              domainSlug === d.slug ? "border-globanic-blue text-globanic-navy" : "border-transparent text-slate-500 hover:text-globanic-navy"
            }`}
          >
            {d.name}
          </Link>
        ))}
      </nav>

      {resources.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-body-sm text-slate-500">
          {domainSlug ? dict.search.noPublishedResourcesInDomain : dict.search.noPublishedResourcesAll}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </div>
  );
}
