import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUniversityBySlug } from "@/server/services/public-directory.service";
import { listPublishedResources } from "@/server/services/public-resource.service";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildUniversityJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/utils/site-url";
import { JsonLd } from "@/components/seo/JsonLd";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const PAGE_SIZE = 20;

function isValidHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

type PageParams = { slug: string };
type PageSearchParams = { page?: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}): Promise<Metadata> {
  const university = await getUniversityBySlug(params.slug);
  const dict = await getDictionary(await getLocale());
  if (!university) return { title: dict.common.notFound };

  const location = [university.city, university.country].filter(Boolean).join(dict.common.listSeparator);
  const description = location
    ? dict.university.metaDescriptionWithLocation
        .replace("{name}", university.name)
        .replace("{location}", location)
        .replace("{count}", String(university._count.resources))
    : dict.university.metaDescriptionNoLocation
        .replace("{name}", university.name)
        .replace("{count}", String(university._count.resources));

  return buildPageMetadata({
    title: university.name,
    description,
    path: `/universities/${params.slug}`,
    searchParams,
    allowedParams: ["page"],
  });
}

export default async function UniversityDetailPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}) {
  const university = await getUniversityBySlug(params.slug);
  if (!university) notFound();

  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const page = parsePage(searchParams.page);
  const { resources, hasMore } = await listPublishedResources({
    universityId: university.id,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <div className="container-page py-10">
      <JsonLd data={buildUniversityJsonLd(university, absoluteUrl(`/universities/${params.slug}`))} />

      <nav aria-label={dict.common.breadcrumbNav} className="mb-6 flex flex-wrap items-center gap-1 text-body-sm text-slate-500">
        <Link href="/" className="hover:text-globanic-blue">Globanic</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <Link href="/universities" className="hover:text-globanic-blue">{dict.nav.universities}</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span>{university.name}</span>
      </nav>

      <div className="mb-6 flex items-center gap-4">
        {isValidHttpUrl(university.logoUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={university.logoUrl}
            alt={university.name}
            className="h-16 w-16 shrink-0 rounded border border-slate-200 object-contain"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-slate-100 text-h3 font-semibold text-globanic-navy">
            {university.name.charAt(0)}
          </span>
        )}
        <div>
          <h1 className="text-h2 font-semibold text-globanic-navy">{university.name}</h1>
          <p className="text-body-sm text-slate-500">
            {[university.city, university.country].filter(Boolean).join(dict.common.listSeparator)}
          </p>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6 text-body-sm text-slate-600">
        <span>
          {university._count.resources} {dict.common.publishedResourceCountSuffix}
        </span>
        <span>
          {university._count.authors} {dict.search.kindAuthor}
        </span>
        {university.faculties.length > 0 && (
          <span>
            {university.faculties.length} {dict.university.facultiesCountSuffix}
          </span>
        )}
        {isValidHttpUrl(university.officialWebsite) && (
          <a
            href={university.officialWebsite}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-globanic-blue hover:underline"
          >
            {dict.university.officialWebsiteLink}
          </a>
        )}
      </div>

      {university.faculties.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-h4 font-semibold text-globanic-navy">{dict.university.facultiesHeading}</h2>
          <ul className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2">
            {university.faculties.map((f) => (
              <li key={f.id} className="border-slate-100">
                <Link href={`/faculties/${f.id}`} className="flex items-center justify-between px-1 py-3 hover:bg-slate-50">
                  <span className="text-body-sm font-medium text-globanic-navy">{f.name}</span>
                  <span className="text-caption text-slate-400">
                    {f._count.resources} {dict.search.resourceCountSuffix}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-h4 font-semibold text-globanic-navy">{dict.university.publishedResourcesHeading}</h2>
        {resources.length === 0 ? (
          <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-body-sm text-slate-500">
            {dict.university.noResourcesFromUniversity}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
        <ResourceListPagination page={page} hasMore={hasMore} />
      </section>
    </div>
  );
}
