"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "@/components/i18n/I18nProvider";

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
  const t = useTranslations("common");

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
        className="rounded border border-slate-300 px-4 py-2 text-body-sm font-medium text-globanic-navy transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("previous")}
      </button>
      <span className="text-body-sm text-slate-500">{t("pageLabel", { page })}</span>
      <button
        onClick={() => goToPage(page + 1)}
        disabled={!hasMore}
        className="rounded border border-slate-300 px-4 py-2 text-body-sm font-medium text-globanic-navy transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("next")}
      </button>
    </div>
  );
}
