import type { Metadata } from "next";
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

const PAGE_SIZE = 20;

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
  if (!university) return { title: "غير موجود" };

  const location = [university.city, university.country].filter(Boolean).join("، ");
  const description = location
    ? `موارد أكاديمية منشورة من ${university.name}، ${location} — ${university._count.resources} مورد.`
    : `موارد أكاديمية منشورة من ${university.name} — ${university._count.resources} مورد.`;

  return buildPageMetadata({
    title: university.name,
    description,
    path: `/universities/${params.slug}`,
    // The resource list within this page is itself paginated — its
    // canonical must reflect ?page just like /resources does, otherwise
    // page 2 of a university's resources would incorrectly canonicalize
    // to page 1.
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

  const page = parsePage(searchParams.page);
  const { resources, hasMore } = await listPublishedResources({
    universityId: university.id,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <JsonLd data={buildUniversityJsonLd(university, absoluteUrl(`/universities/${params.slug}`))} />

      <div className="mb-6 flex items-center gap-4">
        {university.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={university.logoUrl}
            alt={university.name}
            className="h-16 w-16 rounded-lg border border-gray-100 object-contain"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold text-globanic-navy">{university.name}</h1>
          <p className="text-sm text-gray-500">
            {[university.city, university.country].filter(Boolean).join("، ")}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 text-sm text-gray-600">
        <span>{university._count.resources} مورد منشور</span>
        <span>{university._count.authors} باحث</span>
        {university.officialWebsite && (
          <a
            href={university.officialWebsite}
            target="_blank"
            rel="noreferrer"
            className="text-globanic-blue hover:underline"
          >
            الموقع الرسمي
          </a>
        )}
      </div>

      {resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد موارد منشورة من هذه الجامعة حاليًا.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </main>
  );
}
