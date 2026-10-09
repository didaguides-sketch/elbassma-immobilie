import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPublisherById } from "@/server/services/public-directory.service";
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

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const publisher = await getPublicPublisherById(params.id);
  const dict = await getDictionary(await getLocale());
  if (!publisher || !publisher.displayName) return { title: dict.common.notFound };

  return buildPageMetadata({
    title: publisher.displayName,
    description: dict.publisher.metaDescription
      .replace("{count}", String(publisher.publishedResourceCount))
      .replace("{name}", publisher.displayName),
    path: `/publishers/${params.id}`,
    // Same reasoning as /faculties/[id] (Phase 6): an id-based URL with
    // no independent discovery value outside a resource page's context,
    // and — more importantly here — PublisherProfile has no public bio/
    // logo/description, so this page is too thin to be a meaningful
    // standalone search-engine destination. Reachable only via a real
    // link from resource pages, never indexed on its own.
    noindex: true,
  });
}

export default async function PublisherDetailPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}) {
  const publisher = await getPublicPublisherById(params.id);
  // A publisher account with no display name (Profile never completed)
  // has nothing genuine to show publicly — treated the same as
  // not-found rather than rendering a blank identity.
  if (!publisher || !publisher.displayName) notFound();

  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const page = parsePage(searchParams.page);
  const { resources, hasMore } = await listPublishedResources({
    uploadedById: publisher.id,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <div className="container-page py-10">
      <nav aria-label={dict.common.breadcrumbNav} className="mb-6 flex flex-wrap items-center gap-1 text-body-sm text-slate-500">
        <Link href="/" className="hover:text-globanic-blue">Globanic</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span>{publisher.displayName}</span>
      </nav>

      <div className="mb-8 flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-h3 font-semibold text-globanic-navy">
          {publisher.displayName.charAt(0)}
        </span>
        <div>
          <h1 className="text-h2 font-semibold text-globanic-navy">
            {publisher.displayName}
            {publisher.verified && (
              <span aria-label={dict.publisher.verifiedLabel} title={dict.publisher.verifiedLabel} className="text-globanic-blue">
                {" "}✓
              </span>
            )}
          </h1>
          <p className="text-body-sm text-slate-500">
            {publisher.publishedResourceCount} {dict.common.publishedResourceCountSuffix}
          </p>
        </div>
      </div>

      {resources.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-body-sm text-slate-500">
          {dict.publisher.noResourcesFromPublisher}
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
