import type { Metadata } from "next";
import { searchResources } from "@/server/services/search.service";
import { listDomainsWithSpecialties, listUniversitiesWithFaculties } from "@/server/services/taxonomy.service";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { buildPageMetadata } from "@/lib/seo/metadata";

const PAGE_SIZE = 20;

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "relevance", label: "الأكثر صلة" },
  { value: "recent", label: "الأحدث" },
  { value: "most_viewed", label: "الأكثر مشاهدة" },
  { value: "most_downloaded", label: "الأكثر تحميلاً" },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "COURS", label: "Cours" },
  { value: "MEMOIRE", label: "Mémoire" },
  { value: "ARTICLE", label: "Article" },
  { value: "THESE", label: "Thèse" },
  { value: "LIVRE", label: "Livre" },
];

type SearchParams = {
  q?: string;
  type?: string;
  domain?: string;
  university?: string;
  language?: string;
  sort?: string;
  page?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const q = searchParams.q?.trim();

  return buildPageMetadata({
    title: q ? `نتائج البحث عن «${q}»` : "بحث",
    description: q
      ? `نتائج البحث عن "${q}" في الموارد الأكاديمية المنشورة على Globanic.`
      : "ابحث في الموارد الأكاديمية المنشورة على Globanic.",
    path: "/search",
    searchParams,
    allowedParams: ["q", "type", "domain", "university", "language", "sort", "page"],
    // Query-driven results pages are a classic thin/duplicate-content
    // pattern — never indexed directly, per the approved plan. Still
    // crawlable (see robots.ts) so this directive is actually seen.
    noindex: true,
  });
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const page = parsePage(searchParams.page);
  const q = searchParams.q ?? "";
  const hasQuery = q.trim().length > 0;

  const [{ items, hasMore }, domains, universities] = await Promise.all([
    searchResources({
      q,
      type: searchParams.type,
      domainSlug: searchParams.domain,
      universityId: searchParams.university,
      language: searchParams.language,
      sort: searchParams.sort,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    listDomainsWithSpecialties(),
    listUniversitiesWithFaculties(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">البحث</h1>

      {/* Plain GET form — search works without any client-side JavaScript. */}
      <form method="get" className="mb-8 space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="ابحث عن عنوان، مؤلف، جامعة..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <select
            name="type"
            defaultValue={searchParams.type ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">كل الأنواع</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            name="domain"
            defaultValue={searchParams.domain ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">كل المجالات</option>
            {domains.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            name="university"
            defaultValue={searchParams.university ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">كل الجامعات</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            name="sort"
            defaultValue={searchParams.sort ?? "relevance"}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-globanic-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-globanic-blueLight"
        >
          بحث
        </button>
      </form>

      {!hasQuery ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          اكتب كلمة للبحث عن الموارد المنشورة.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد نتائج مطابقة لـ «{q}».
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      {hasQuery && <ResourceListPagination page={page} hasMore={hasMore} />}
    </main>
  );
}
