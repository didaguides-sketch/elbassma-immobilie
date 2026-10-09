import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { searchResources, getAvailableSearchLanguages } from "@/server/services/search.service";
import { listUniversities, listAuthors } from "@/server/services/public-directory.service";
import { listDomainsWithResourceCounts, searchDomains } from "@/server/services/taxonomy.service";
import { parsePage } from "@/lib/utils/pagination";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { SearchFilterBar } from "@/components/search/SearchFilterBar";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { formatNumber } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/config";

const PAGE_SIZE = 20;
const VALID_KINDS = ["all", "resources", "universities", "authors", "domains"] as const;
type Kind = (typeof VALID_KINDS)[number];

function parseKind(raw?: string): Kind {
  return (VALID_KINDS as readonly string[]).includes(raw ?? "") ? (raw as Kind) : "all";
}

type PageSearchParams = {
  q?: string;
  kind?: string;
  type?: string;
  domain?: string;
  university?: string;
  language?: string;
  sort?: string;
  page?: string;
};

export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }): Promise<Metadata> {
  const q = (searchParams.q ?? "").trim();
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    title: q ? dict.search.resultsTitle.replace("{q}", q) : dict.nav.search,
    description: q
      ? dict.search.resultsMetaDescriptionWithQuery.replace("{q}", q)
      : dict.search.resultsMetaDescriptionEmpty,
    path: "/search",
    // Search-result pages are intentionally not indexed: an unbounded
    // space of query/filter combinations is exactly the "thin/duplicate
    // SEO content" the brief warns against. Discovery for crawlers goes
    // through /resources, /universities, /authors, /domains instead,
    // which are indexable, finite, and already link to this content.
    noindex: true,
  });
}

export default async function SearchPage({ searchParams }: { searchParams: PageSearchParams }) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const q = (searchParams.q ?? "").trim();
  const kind = parseKind(searchParams.kind);
  const page = parsePage(searchParams.page);
  const skip = (page - 1) * PAGE_SIZE;

  const [domainsForFilter, universitiesForFilter, languagesForFilter] = q
    ? await Promise.all([listDomainsWithResourceCounts(), listUniversities({ take: 100 }), getAvailableSearchLanguages()])
    : [[], { universities: [] as Awaited<ReturnType<typeof listUniversities>>["universities"], hasMore: false }, [] as string[]];

  let resourceResult: Awaited<ReturnType<typeof searchResources>> | null = null;
  let universityResult: Awaited<ReturnType<typeof listUniversities>> | null = null;
  let authorResult: Awaited<ReturnType<typeof listAuthors>> | null = null;
  let domainResults: Awaited<ReturnType<typeof searchDomains>> = [];

  const ALL_PREVIEW_TAKE = 4;

  if (q) {
    if (kind === "all") {
      [resourceResult, universityResult, authorResult, domainResults] = await Promise.all([
        searchResources({ q, take: ALL_PREVIEW_TAKE, sort: "relevance" }),
        listUniversities({ q, take: ALL_PREVIEW_TAKE }),
        listAuthors({ q, take: ALL_PREVIEW_TAKE }),
        searchDomains(q, ALL_PREVIEW_TAKE),
      ]);
    } else if (kind === "resources") {
      resourceResult = await searchResources({
        q,
        type: searchParams.type,
        domainSlug: searchParams.domain,
        universityId: searchParams.university,
        language: searchParams.language,
        sort: searchParams.sort,
        take: PAGE_SIZE,
        skip,
      });
    } else if (kind === "universities") {
      universityResult = await listUniversities({ q, take: PAGE_SIZE, skip });
    } else if (kind === "authors") {
      authorResult = await listAuthors({ q, take: PAGE_SIZE, skip });
    } else if (kind === "domains") {
      domainResults = await searchDomains(q, 50);
    }
  }

  const domainOptions = domainsForFilter.map((d) => ({ value: d.slug, label: d.name }));
  const universityOptions = universitiesForFilter.universities.map((u) => ({ value: u.id, label: u.name }));

  return (
    <div className="container-page py-10">
      <header className="mb-6">
        <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-globanic-blue">{dict.nav.search}</p>
        {q ? (
          <h1 className="text-h2 font-semibold text-globanic-navy">{dict.search.resultsTitle.replace("{q}", q)}</h1>
        ) : (
          <h1 className="text-h2 font-semibold text-globanic-navy">{dict.search.searchGlobanicHeading}</h1>
        )}
      </header>

      <div className="mx-auto mb-8 max-w-xl">
        <SearchFormFallback defaultValue={q} dict={dict} />
      </div>

      {!q ? (
        <InitialState dict={dict} />
      ) : (
        <>
          <SearchFilterBar
            activeKind={kind}
            domainOptions={domainOptions}
            universityOptions={universityOptions}
            languageOptions={languagesForFilter}
          />

          <div className="py-8">
            {kind === "all" && (
              <AllKindResults
                q={q}
                dict={dict}
                resourceResult={resourceResult}
                universityResult={universityResult}
                authorResult={authorResult}
                domainResults={domainResults}
              />
            )}

            {kind === "resources" && resourceResult && (
              <ResourcesResults result={resourceResult} page={page} dict={dict} locale={locale} />
            )}

            {kind === "universities" && universityResult && (
              <UniversitiesResults result={universityResult} page={page} dict={dict} />
            )}

            {kind === "authors" && authorResult && <AuthorsResults result={authorResult} page={page} dict={dict} />}

            {kind === "domains" && <DomainsResults results={domainResults} dict={dict} />}
          </div>
        </>
      )}
    </div>
  );
}

function SearchFormFallback({ defaultValue, dict }: { defaultValue: string; dict: Dictionary }) {
  return (
    <form action="/search" method="get" role="search" className="flex gap-2">
      <label htmlFor="search-page-input" className="sr-only">
        {dict.search.formLabel}
      </label>
      <input
        id="search-page-input"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={dict.search.placeholder}
        className="h-11 w-full rounded border border-slate-300 px-3 text-body text-globanic-navy placeholder:text-slate-400"
      />
      <button type="submit" className="rounded bg-globanic-navy px-5 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep">
        {dict.search.submit}
      </button>
    </form>
  );
}

function InitialState({ dict }: { dict: Dictionary }) {
  return (
    <div className="rounded border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <p className="mb-2 text-body font-medium text-globanic-navy">{dict.search.initialStateHeading}</p>
      <p className="mx-auto max-w-md text-body-sm text-slate-500">{dict.search.initialStateBody}</p>
    </div>
  );
}

function NoResults({ q, dict }: { q: string; dict: Dictionary }) {
  return (
    <div className="rounded border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <p className="mb-2 text-body font-medium text-globanic-navy">{dict.search.noResultsTitle.replace("{q}", q)}</p>
      <p className="mx-auto max-w-md text-body-sm text-slate-500">{dict.search.noResultsBody}</p>
    </div>
  );
}

function SectionHeading({
  title,
  count,
  seeAllHref,
  seeAllLabel,
}: {
  title: string;
  count: number;
  seeAllHref?: string;
  seeAllLabel: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="text-h4 font-semibold text-globanic-navy">
        {title} <span className="font-normal text-slate-400">({count})</span>
      </h2>
      {seeAllHref && (
        <Link href={seeAllHref} className="text-body-sm font-semibold text-globanic-blue hover:underline">
          {seeAllLabel}
        </Link>
      )}
    </div>
  );
}

function AllKindResults({
  q,
  dict,
  resourceResult,
  universityResult,
  authorResult,
  domainResults,
}: {
  q: string;
  dict: Dictionary;
  resourceResult: Awaited<ReturnType<typeof searchResources>> | null;
  universityResult: Awaited<ReturnType<typeof listUniversities>> | null;
  authorResult: Awaited<ReturnType<typeof listAuthors>> | null;
  domainResults: Awaited<ReturnType<typeof searchDomains>>;
}) {
  const totalFound =
    (resourceResult?.items.length ?? 0) +
    (universityResult?.universities.length ?? 0) +
    (authorResult?.authors.length ?? 0) +
    domainResults.length;

  if (totalFound === 0) return <NoResults q={q} dict={dict} />;

  return (
    <div className="space-y-10">
      {resourceResult && resourceResult.items.length > 0 && (
        <section>
          <SectionHeading
            title={dict.nav.resources}
            count={resourceResult.total ?? resourceResult.items.length}
            seeAllHref={`/search?q=${encodeURIComponent(q)}&kind=resources`}
            seeAllLabel={dict.search.seeAll}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resourceResult.items.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        </section>
      )}

      {universityResult && universityResult.universities.length > 0 && (
        <section>
          <SectionHeading
            title={dict.nav.universities}
            count={universityResult.universities.length}
            seeAllHref={`/search?q=${encodeURIComponent(q)}&kind=universities`}
            seeAllLabel={dict.search.seeAll}
          />
          <UniversityList universities={universityResult.universities} dict={dict} />
        </section>
      )}

      {authorResult && authorResult.authors.length > 0 && (
        <section>
          <SectionHeading
            title={dict.nav.authors}
            count={authorResult.authors.length}
            seeAllHref={`/search?q=${encodeURIComponent(q)}&kind=authors`}
            seeAllLabel={dict.search.seeAll}
          />
          <AuthorList authors={authorResult.authors} dict={dict} />
        </section>
      )}

      {domainResults.length > 0 && (
        <section>
          <SectionHeading
            title={dict.nav.domains}
            count={domainResults.length}
            seeAllHref={`/search?q=${encodeURIComponent(q)}&kind=domains`}
            seeAllLabel={dict.search.seeAll}
          />
          <DomainList domains={domainResults} />
        </section>
      )}
    </div>
  );
}

function ResourcesResults({
  result,
  page,
  dict,
  locale,
}: {
  result: Awaited<ReturnType<typeof searchResources>>;
  page: number;
  dict: Dictionary;
  locale: UiLocale;
}) {
  if (result.items.length === 0) return <NoResults q={result.query} dict={dict} />;
  return (
    <div>
      {typeof result.total === "number" && (
        <p className="mb-4 text-body-sm text-slate-500">
          {dict.search.resultsCount.replace("{count}", formatNumber(result.total, locale))}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
      </div>
      <ResourceListPagination page={page} hasMore={result.hasMore} />
    </div>
  );
}

function UniversityList({
  universities,
  dict,
}: {
  universities: Awaited<ReturnType<typeof listUniversities>>["universities"];
  dict: Dictionary;
}) {
  return (
    <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2">
      {universities.map((u) => (
        <Link key={u.id} href={`/universities/${u.slug}`} className="flex items-center gap-3 py-3 hover:bg-slate-50">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-body-sm font-semibold text-globanic-navy">
            {u.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-body-sm font-medium text-globanic-navy">{u.name}</p>
            <p className="text-caption text-slate-500">
              {[u.city, u.country].filter(Boolean).join(dict.common.listSeparator)} · {u._count.resources} {dict.search.resourceCountSuffix}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function UniversitiesResults({
  result,
  page,
  dict,
}: {
  result: Awaited<ReturnType<typeof listUniversities>>;
  page: number;
  dict: Dictionary;
}) {
  if (result.universities.length === 0) return <NoResults q="" dict={dict} />;
  return (
    <div>
      <UniversityList universities={result.universities} dict={dict} />
      <ResourceListPagination page={page} hasMore={result.hasMore} />
    </div>
  );
}

function AuthorList({ authors, dict }: { authors: Awaited<ReturnType<typeof listAuthors>>["authors"]; dict: Dictionary }) {
  return (
    <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2">
      {authors.map((a) => (
        <Link key={a.id} href={`/authors/${a.slug}`} className="flex items-center gap-3 py-3 hover:bg-slate-50">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-body-sm font-semibold text-globanic-navy">
            {a.fullName.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-body-sm font-medium text-globanic-navy">
              {a.fullName}
              {a.verified && (
                <span aria-label={dict.search.verifiedLabel} title={dict.search.verifiedLabel} className="ms-1 text-globanic-blue">
                  ✓
                </span>
              )}
            </p>
            {a.university && <p className="truncate text-caption text-slate-500">{a.university.name}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}

function AuthorsResults({
  result,
  page,
  dict,
}: {
  result: Awaited<ReturnType<typeof listAuthors>>;
  page: number;
  dict: Dictionary;
}) {
  if (result.authors.length === 0) return <NoResults q="" dict={dict} />;
  return (
    <div>
      <AuthorList authors={result.authors} dict={dict} />
      <ResourceListPagination page={page} hasMore={result.hasMore} />
    </div>
  );
}

function DomainList({ domains }: { domains: Awaited<ReturnType<typeof searchDomains>> }) {
  return (
    <ul className="grid grid-cols-2 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
      {domains.map((d) => (
        <li key={d.id} className="border-slate-100 sm:border-e">
          <Link href={`/domains/${d.slug}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
            <span className="text-body-sm font-medium text-globanic-navy">{d.name}</span>
            <span className="text-caption text-slate-400">{d._count.resources}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DomainsResults({ results, dict }: { results: Awaited<ReturnType<typeof searchDomains>>; dict: Dictionary }) {
  if (results.length === 0) return <NoResults q="" dict={dict} />;
  return <DomainList domains={results} />;
}
