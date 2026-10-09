import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDomainBySlug,
  listUniversitiesWithResourcesInDomain,
  listAuthorsWithResourcesInDomain,
} from "@/server/services/public-directory.service";
import { listPublishedResources } from "@/server/services/public-resource.service";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const PAGE_SIZE = 20;

type PageParams = { slug: string };
type PageSearchParams = { page?: string; specialty?: string };

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const domain = await getDomainBySlug(params.slug);
  const dict = await getDictionary(await getLocale());
  if (!domain) return { title: dict.common.notFound };

  return buildPageMetadata({
    title: domain.name,
    description: dict.domain.metaDescription
      .replace("{count}", String(domain._count.resources))
      .replace("{domain}", domain.name),
    path: `/domains/${params.slug}`,
    // Deliberately NOT including `specialty` in allowedParams: the
    // specialty filter changes which resources are displayed but the
    // canonical always points at the domain level. Doing otherwise
    // would create one indexable URL per specialty combination — the
    // "faceted SEO spam" this phase explicitly warns against — for
    // pages that don't have enough unique content to justify it.
  });
}

export default async function DomainDetailPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}) {
  const domain = await getDomainBySlug(params.slug);
  if (!domain) notFound();

  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const page = parsePage(searchParams.page);
  const activeSpecialty = domain.specialties.find((s) => s.slug === searchParams.specialty);

  const [resourceResult, articleResult, universities, authors] = await Promise.all([
    listPublishedResources({
      domainSlug: domain.slug,
      specialtySlug: activeSpecialty?.slug,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    // Small preview only — not paginated separately, avoids a second
    // full listing UI for what is still just "resources of type ARTICLE
    // in this domain" (see Phase 5: Article === Resource.type).
    listPublishedResources({ domainSlug: domain.slug, type: "ARTICLE", take: 3 }),
    listUniversitiesWithResourcesInDomain(domain.id, 8),
    listAuthorsWithResourcesInDomain(domain.id, 8),
  ]);

  return (
    <div className="container-page py-10">
      <nav aria-label={dict.common.breadcrumbNav} className="mb-6 flex flex-wrap items-center gap-1 text-body-sm text-slate-500">
        <Link href="/" className="hover:text-globanic-blue">Globanic</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <Link href="/domains" className="hover:text-globanic-blue">{dict.nav.domains}</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span>{domain.name}</span>
      </nav>

      <h1 className="mb-1 text-h2 font-semibold text-globanic-navy">{domain.name}</h1>
      <p className="mb-8 text-body-sm text-slate-500">
        {domain._count.resources} {dict.common.publishedResourceCountSuffix}
      </p>

      {domain.specialties.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href={`/domains/${domain.slug}`}
            className={`rounded border px-3 py-1.5 text-body-sm font-medium transition ${
              !activeSpecialty
                ? "border-globanic-blue bg-blue-50 text-globanic-blue"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {dict.search.filterAll}
          </Link>
          {domain.specialties.map((s) => (
            <Link
              key={s.id}
              href={`/domains/${domain.slug}?specialty=${s.slug}`}
              className={`rounded border px-3 py-1.5 text-body-sm font-medium transition ${
                activeSpecialty?.id === s.id
                  ? "border-globanic-blue bg-blue-50 text-globanic-blue"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.name} <span className="text-slate-400">({s._count.resources})</span>
            </Link>
          ))}
        </div>
      )}

      <section className="mb-12">
        <h2 className="mb-4 text-h4 font-semibold text-globanic-navy">
          {dict.nav.resources}{activeSpecialty ? ` — ${activeSpecialty.name}` : ""}
        </h2>
        {resourceResult.items.length === 0 ? (
          <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-body-sm text-slate-500">
            {activeSpecialty ? dict.domain.noResourcesInSpecialty : dict.domain.noResourcesInDomain}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resourceResult.items.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
        <ResourceListPagination page={page} hasMore={resourceResult.hasMore} />
      </section>

      {articleResult.items.length > 0 && (
        <section className="mb-12 border-t border-slate-100 pt-8">
          <h2 className="mb-4 font-serif text-h4 font-semibold text-globanic-navy">{dict.domain.articlesInDomainHeading}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {articleResult.items.map((a) => (
              <ResourceCard key={a.id} resource={a} />
            ))}
          </div>
        </section>
      )}

      {universities.length > 0 && (
        <section className="mb-12 border-t border-slate-100 pt-8">
          <h2 className="mb-1 text-h4 font-semibold text-globanic-navy">{dict.domain.universitiesInDomainHeading}</h2>
          <p className="mb-4 text-caption text-slate-400">
            {dict.domain.universitiesInDomainNote}
          </p>
          <ul className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2">
            {universities.map((u) => (
              <li key={u.id} className="border-slate-100">
                <Link href={`/universities/${u.slug}`} className="flex items-center justify-between px-1 py-3 hover:bg-slate-50">
                  <span className="text-body-sm font-medium text-globanic-navy">{u.name}</span>
                  <span className="text-caption text-slate-400">
                    {u._count.resources} {dict.search.resourceCountSuffix}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {authors.length > 0 && (
        <section className="border-t border-slate-100 pt-8">
          <h2 className="mb-4 text-h4 font-semibold text-globanic-navy">{dict.domain.authorsInDomainHeading}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {authors.map((a) => (
              <Link key={a.id} href={`/authors/${a.slug}`} className="text-center group">
                <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-body font-semibold text-globanic-navy">
                  {a.fullName.charAt(0)}
                </span>
                <p className="text-body-sm font-medium text-globanic-navy group-hover:text-globanic-blue">
                  {a.fullName}
                  {a.verified && (
                    <span aria-label={dict.search.verifiedLabel} title={dict.search.verifiedLabel} className="text-globanic-blue">
                      {" "}✓
                    </span>
                  )}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
