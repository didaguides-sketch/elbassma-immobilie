import type { Metadata } from "next";
import Link from "next/link";
import { listUniversities } from "@/server/services/public-directory.service";
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
    title: "الجامعات",
    description: "تصفّح الجامعات ذات الموارد الأكاديمية المنشورة على Globanic.",
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
  const page = parsePage(searchParams.page);
  const { universities, hasMore } = await listUniversities({
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">الجامعات</h1>

      {universities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد جامعات مسجّلة حاليًا.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <Link
              key={u.id}
              href={`/universities/${u.slug}`}
              className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <h3 className="mb-1 font-semibold text-globanic-navy">{u.name}</h3>
              <p className="mb-2 text-xs text-gray-500">
                {[u.city, u.country].filter(Boolean).join("، ")}
              </p>
              <p className="text-xs text-gray-400">{u._count.resources} مورد منشور</p>
            </Link>
          ))}
        </div>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </main>
  );
}
