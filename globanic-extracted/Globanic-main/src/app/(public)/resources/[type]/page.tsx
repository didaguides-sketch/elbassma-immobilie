import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublishedResources, type PublishedResourcesSort } from "@/server/services/public-resource.service";
import { listDomainsWithSpecialties } from "@/server/services/taxonomy.service";
import { getAvailableSearchLanguages } from "@/server/services/search.service";
import { urlSegmentToResourceType } from "@/lib/utils/resource-type";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";

const PAGE_SIZE = 20;

function articleSorts(dict: Dictionary): { value: PublishedResourcesSort; label: string }[] {
  // Honest, real sort options — both backed by real Resource fields
  // (publishedAt / viewsCount), no fabricated "trending"/"featured" logic.
  return [
    { value: "recent", label: dict.search.sortRecent },
    { value: "most_viewed", label: dict.search.sortMostViewed },
  ];
}

function parseArticleSort(raw?: string): PublishedResourcesSort {
  return raw === "most_viewed" ? "most_viewed" : "recent";
}

type PageParams = { type: string };
type PageSearchParams = { page?: string; domain?: string; sort?: string; language?: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  const type = urlSegmentToResourceType(params.type);
  if (!type) return { title: dict.common.notFound };

  const isArticle = type === "ARTICLE";

  return buildPageMetadata({
    title: isArticle ? dict.nav.articles : dict.resourceType[type],
    description: isArticle
      ? dict.search.articlesMetaDescription
      : dict.search.typeResourcesDescription.replace("{type}", dict.resourceType[type]),
    path: `/resources/${params.type}`,
    searchParams,
    allowedParams: isArticle ? ["page", "domain", "sort", "language"] : ["page", "domain"],
  });
}

export default async function ResourcesByTypePage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const type = urlSegmentToResourceType(params.type);
  // An unknown URL segment (anything not one of the 5 real resource
  // types) is a genuine 404 — never silently fall back to "all resources".
  if (!type) notFound();

  const isArticle = type === "ARTICLE";
  const page = parsePage(searchParams.page);
  const domainSlug = searchParams.domain || undefined;
  const sort = isArticle ? parseArticleSort(searchParams.sort) : "recent";
  const language = isArticle ? searchParams.language || undefined : undefined;
  const ARTICLE_SORTS = articleSorts(dict);

  const [{ resources, hasMore }, domains, languages] = await Promise.all([
    listPublishedResources({ type, domainSlug, language, sort, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    listDomainsWithSpecialties(),
    isArticle ? getAvailableSearchLanguages() : Promise.resolve([] as string[]),
  ]);

  function buildHref(overrides: { domain?: string | null; sort?: string | null; language?: string | null }) {
    const p = new URLSearchParams();
    const domainVal = overrides.domain !== undefined ? overrides.domain : domainSlug;
    const sortVal = overrides.sort !== undefined ? overrides.sort : searchParams.sort;
    const langVal = overrides.language !== undefined ? overrides.language : searchParams.language;
    if (domainVal) p.set("domain", domainVal);
    if (sortVal) p.set("sort", sortVal);
    if (langVal) p.set("language", langVal);
    const qs = p.toString();
    return `/resources/${params.type}${qs ? `?${qs}` : ""}`;
  }

  const typeLabel = dict.resourceType[type];
  const emptyStateText = domainSlug
    ? dict.search.noPublishedResourcesOfTypeInDomain.replace("{type}", typeLabel)
    : dict.search.noPublishedResourcesOfType.replace("{type}", typeLabel);

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className={`mb-2 text-h2 font-semibold text-globanic-navy ${isArticle ? "font-serif" : ""}`}>
          {isArticle ? dict.nav.articles : typeLabel}
        </h1>
        {isArticle && (
          <p className="max-w-xl text-body-sm text-slate-500">{dict.search.articlesPageSubtitle}</p>
        )}
      </header>

      <nav aria-label={dict.search.filterByDomain} role="tablist" className="mb-4 flex flex-wrap gap-1 overflow-x-auto border-b border-slate-100">
        <Link
          href={buildHref({ domain: null })}
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
            href={buildHref({ domain: d.slug })}
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

      {isArticle && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {/* Only two sort options and a handful of languages — plain
              links that vary the URL, not a <select>, so this page stays
              a Server Component with no client-side JS required to sort
              or filter (a native <select> would need an onChange handler
              to navigate, which would mean converting this whole page to
              a Client Component just for that). */}
          <div className="flex gap-1" role="group" aria-label={dict.search.sortLabel}>
            {ARTICLE_SORTS.map((s) => (
              <Link
                key={s.value}
                href={buildHref({ sort: s.value === "recent" ? null : s.value })}
                className={`rounded border px-3 py-1.5 text-body-sm font-medium ${
                  sort === s.value ? "border-globanic-blue bg-blue-50 text-globanic-blue" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>

          {languages.length > 0 && (
            <div className="flex flex-wrap gap-1" role="group" aria-label={dict.common.language}>
              <Link
                href={buildHref({ language: null })}
                className={`rounded border px-3 py-1.5 text-body-sm font-medium ${
                  !language ? "border-globanic-blue bg-blue-50 text-globanic-blue" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {dict.search.allLanguages}
              </Link>
              {languages.map((lang) => (
                <Link
                  key={lang}
                  href={buildHref({ language: lang })}
                  className={`rounded border px-3 py-1.5 text-body-sm font-medium ${
                    language === lang ? "border-globanic-blue bg-blue-50 text-globanic-blue" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {lang}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {resources.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-body-sm text-slate-500">
          {emptyStateText}
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
