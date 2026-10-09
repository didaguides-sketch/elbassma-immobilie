import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDomainBySlug } from "@/server/services/public-directory.service";
import { listPublishedResources } from "@/server/services/public-resource.service";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { buildPageMetadata } from "@/lib/seo/metadata";

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
  const domain = await getDomainBySlug(params.slug);
  if (!domain) return { title: "غير موجود" };

  return buildPageMetadata({
    title: domain.name,
    description: `${domain._count.resources} مورد أكاديمي منشور في مجال ${domain.name} على Globanic.`,
    path: `/domains/${params.slug}`,
    searchParams,
    allowedParams: ["page"],
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

  const page = parsePage(searchParams.page);
  const { resources, hasMore } = await listPublishedResources({
    domainSlug: domain.slug,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-globanic-navy">{domain.name}</h1>
      <p className="mb-6 text-sm text-gray-500">{domain._count.resources} مورد منشور</p>

      {domain.specialties.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {domain.specialties.map((s) => (
            <span key={s.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
              {s.name}
            </span>
          ))}
        </div>
      )}

      {resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد موارد منشورة في هذا المجال حاليًا.
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
