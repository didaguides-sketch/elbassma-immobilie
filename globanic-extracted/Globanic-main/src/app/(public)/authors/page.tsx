import type { Metadata } from "next";
import Link from "next/link";
import { listAuthors } from "@/server/services/public-directory.service";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const PAGE_SIZE = 24;

type PageSearchParams = { page?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: PageSearchParams;
}): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    title: dict.nav.authors,
    description: dict.author.listMetaDescription,
    path: "/authors",
    searchParams,
    allowedParams: ["page"],
  });
}

export default async function AuthorsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const page = parsePage(searchParams.page);
  const { authors, hasMore } = await listAuthors({
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 text-h2 font-semibold text-globanic-navy">{dict.nav.authors}</h1>

      {authors.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-body-sm text-slate-500">
          {dict.author.noAuthorsRegistered}
        </div>
      ) : (
        <ul className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2">
          {authors.map((a) => (
            <li key={a.id} className="border-slate-100">
              <Link href={`/authors/${a.slug}`} className="flex items-center justify-between px-1 py-3 hover:bg-slate-50">
                <span>
                  <span className="text-body-sm font-medium text-globanic-navy">
                    {a.fullName}
                    {a.verified && (
                      <span aria-label={dict.search.verifiedLabel} title={dict.search.verifiedLabel} className="text-globanic-blue">
                        {" "}✓
                      </span>
                    )}
                  </span>
                  {a.university && <span className="block text-caption text-slate-500">{a.university.name}</span>}
                </span>
                <span className="text-caption text-slate-400">
                  {a.publishedResourceCount} {dict.search.resourceCountSuffix}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </div>
  );
}
