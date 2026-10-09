"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function ResourceListPagination({
  page,
  hasMore,
}: {
  page: number;
  hasMore: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (targetPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(targetPage));
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  if (page <= 1 && !hasMore) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-4">
      <button
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        السابق
      </button>
      <span className="text-sm text-gray-500">صفحة {page}</span>
      <button
        onClick={() => goToPage(page + 1)}
        disabled={!hasMore}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        التالي
      </button>
    </div>
  );
}
