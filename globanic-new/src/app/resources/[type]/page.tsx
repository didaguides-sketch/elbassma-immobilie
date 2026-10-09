import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublishedResources } from "@/server/services/public-resource.service";
import { listDomainsWithSpecialties } from "@/server/services/taxonomy.service";
import { urlSegmentToResourceType } from "@/lib/utils/resource-type";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { buildPageMetadata } from "@/lib/seo/metadata";

const TYPE_LABELS: Record<string, string> = {
  COURS: "Cours",
  MEMOIRE: "Mémoire",
  ARTICLE: "Article",
  THESE: "Thèse",
  LIVRE: "Livre",
};

const PAGE_SIZE = 20;

type PageParams = { type: string };
type PageSearchParams = { page?: string; domain?: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}): Promise<Metadata> {
  const type = urlSegmentToResourceType(params.type);
  if (!type) return { title: "غير موجود" };

  return buildPageMetadata({
    title: TYPE_LABELS[type],
    description: `تصفّح كل موارد ${TYPE_LABELS[type]} الأكاديمية المنشورة على Globanic.`,
    path: `/resources/${params.type}`,
    searchParams,
    allowedParams: ["page", "domain"],
  });
}

export default async function ResourcesByTypePage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}) {
  const type = urlSegmentToResourceType(params.type);
  // An unknown URL segment (anything not one of the 5 real resource
  // types) is a genuine 404 — never silently fall back to "all resources".
  if (!type) notFound();

  const page = parsePage(searchParams.page);
  const domainSlug = searchParams.domain || undefined;

  const [{ resources, hasMore }, domains] = await Promise.all([
    listPublishedResources({ type, domainSlug, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    listDomainsWithSpecialties(),
  ]);

  const domainQuerySuffix = (slug?: string) => (slug ? `?domain=${slug}` : "");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">{TYPE_LABELS[type]}</h1>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <Link
          href={`/resources/${params.type}`}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            !domainSlug ? "bg-globanic-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          كل المجالات
        </Link>
        {domains.map((d) => (
          <Link
            key={d.id}
            href={`/resources/${params.type}${domainQuerySuffix(d.slug)}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              domainSlug === d.slug
                ? "bg-globanic-navy text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {d.name}
          </Link>
        ))}
      </nav>

      {resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد موارد منشورة من نوع {TYPE_LABELS[type]}
          {domainSlug ? " في هذا المجال" : ""} حاليًا.
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
