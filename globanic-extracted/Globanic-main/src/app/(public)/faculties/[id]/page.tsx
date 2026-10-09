import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFacultyById } from "@/server/services/public-directory.service";
import { listPublishedResources } from "@/server/services/public-resource.service";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const PAGE_SIZE = 20;

type PageParams = { id: string };
type PageSearchParams = { page?: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}): Promise<Metadata> {
  const faculty = await getFacultyById(params.id);
  const dict = await getDictionary(await getLocale());
  if (!faculty) return { title: dict.common.notFound };

  return buildPageMetadata({
    title: `${faculty.name} — ${faculty.university.name}`,
    description: dict.university.facultyMetaDescription
      .replace("{faculty}", faculty.name)
      .replace("{university}", faculty.university.name)
      .replace("{count}", String(faculty._count.resources)),
    path: `/faculties/${params.id}`,
    searchParams,
    allowedParams: ["page"],
    // Faculty has no slug — the id-based URL is the only canonical form,
    // and this page has no independent discovery value outside its
    // parent university's context, so it's kept out of the primary
    // crawl path rather than indexed as a standalone destination.
    noindex: true,
  });
}

export default async function FacultyDetailPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}) {
  const faculty = await getFacultyById(params.id);
  if (!faculty) notFound();

  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const page = parsePage(searchParams.page);
  const { resources, hasMore } = await listPublishedResources({
    facultyId: faculty.id,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <div className="container-page py-10">
      <nav aria-label={dict.common.breadcrumbNav} className="mb-6 flex flex-wrap items-center gap-1 text-body-sm text-slate-500">
        <Link href="/" className="hover:text-globanic-blue">Globanic</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <Link href="/universities" className="hover:text-globanic-blue">{dict.nav.universities}</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <Link href={`/universities/${faculty.university.slug}`} className="hover:text-globanic-blue">
          {faculty.university.name}
        </Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span>{faculty.name}</span>
      </nav>

      <h1 className="mb-1 text-h2 font-semibold text-globanic-navy">{faculty.name}</h1>
      <p className="mb-8 text-body-sm text-slate-500">
        <Link href={`/universities/${faculty.university.slug}`} className="hover:text-globanic-blue">
          {faculty.university.name}
        </Link>
        {" · "}
        {faculty._count.resources} {dict.common.publishedResourceCountSuffix}
      </p>

      {resources.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-body-sm text-slate-500">
          {dict.university.noResourcesFromFaculty}
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
