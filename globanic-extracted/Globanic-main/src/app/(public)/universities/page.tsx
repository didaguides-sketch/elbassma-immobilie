import type { Metadata } from "next";
import Link from "next/link";
import { listUniversities } from "@/server/services/public-directory.service";
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
    title: dict.nav.universities,
    description: dict.university.listMetaDescription,
    path: "/universities",
    searchParams,
    allowedParams: ["page"],
  });
}

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const page = parsePage(searchParams.page);
  const { universities, hasMore } = await listUniversities({
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 text-h2 font-semibold text-globanic-navy">{dict.nav.universities}</h1>

      {universities.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-body-sm text-slate-500">
          {dict.university.noUniversitiesRegistered}
        </div>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2">
          {universities.map((u) => (
            <Link
              key={u.id}
              href={`/universities/${u.slug}`}
              className="flex items-center gap-3 py-4 hover:bg-slate-50 sm:odd:pe-6 sm:even:ps-6"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-slate-100 text-body font-semibold text-globanic-navy">
                {u.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-globanic-navy">{u.name}</p>
                <p className="text-body-sm text-slate-500">
                  {[u.city, u.country].filter(Boolean).join(dict.common.listSeparator)} · {u._count.resources}{" "}
                  {dict.search.resourceCountSuffix}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </div>
  );
}
