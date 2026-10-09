import type { Metadata } from "next";
import Link from "next/link";
import { listAuthors } from "@/server/services/public-directory.service";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { buildPageMetadata } from "@/lib/seo/metadata";

const PAGE_SIZE = 24;

type PageSearchParams = { page?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: PageSearchParams;
}): Promise<Metadata> {
  return buildPageMetadata({
    title: "الباحثون",
    description: "تصفّح الباحثين والمؤلفين ذوي الموارد الأكاديمية المنشورة على Globanic.",
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
  const page = parsePage(searchParams.page);
  const { authors, hasMore } = await listAuthors({
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">الباحثون</h1>

      {authors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا يوجد باحثون مسجّلون حاليًا.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((a) => (
            <Link
              key={a.id}
              href={`/authors/${a.slug}`}
              className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <h3 className="mb-1 font-semibold text-globanic-navy">
                {a.fullName}
                {a.verified && <span className="mr-1 text-globanic-blue">✓</span>}
              </h3>
              {a.university && <p className="mb-2 text-xs text-gray-500">{a.university.name}</p>}
              <p className="text-xs text-gray-400">{a.publishedResourceCount} مورد منشور</p>
            </Link>
          ))}
        </div>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </main>
  );
}
