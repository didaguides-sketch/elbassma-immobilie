"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "@/components/i18n/I18nProvider";

type Option = { value: string; label: string };

export function SearchFilterBar({
  activeKind,
  domainOptions,
  universityOptions,
  languageOptions,
}: {
  activeKind: string;
  domainOptions: Option[];
  universityOptions: Option[];
  languageOptions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("search");
  const tNav = useTranslations("nav");
  const tType = useTranslations("resourceType");
  const tCommon = useTranslations("common");

  const KIND_TABS: Option[] = [
    { value: "all", label: t("filterAll") },
    { value: "resources", label: tNav("resources") },
    { value: "universities", label: tNav("universities") },
    { value: "authors", label: tNav("authors") },
    { value: "domains", label: tNav("domains") },
  ];

  // Phase 16B, Batch 2: these five values previously had their own,
  // independently-hardcoded Arabic-only labels here — a THIRD,
  // separately-drifted set from the two French-only TYPE_LABELS maps
  // found in ResourceCard.tsx/resources/[type]/page.tsx (COURS showed
  // as the colloquial "كورس" here specifically, not the glossary's
  // "درس"). Now reads from the same shared `resourceType` namespace
  // those use, so all three places agree.
  const TYPE_OPTIONS: Option[] = [
    { value: "COURS", label: tType("COURS") },
    { value: "MEMOIRE", label: tType("MEMOIRE") },
    { value: "ARTICLE", label: tType("ARTICLE") },
    { value: "THESE", label: tType("THESE") },
    { value: "LIVRE", label: tType("LIVRE") },
  ];

  const SORT_OPTIONS: Option[] = [
    { value: "relevance", label: t("sortRelevance") },
    { value: "recent", label: t("sortRecent") },
    { value: "most_viewed", label: t("sortMostViewed") },
    { value: "most_downloaded", label: t("sortMostDownloaded") },
  ];

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // Any filter change resets pagination — staying on page 3 of a
    // now-different result set would be confusing, not helpful.
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeSubFilters = ["type", "domain", "university", "language"].filter((k) => searchParams.get(k));
  const hasActiveFilters = activeSubFilters.length > 0 || (searchParams.get("sort") && searchParams.get("sort") !== "relevance");

  return (
    <div className="border-b border-slate-100">
      {/* Content-kind tabs */}
      <div role="tablist" aria-label={t("contentTypeLabel")} className="flex gap-1 overflow-x-auto">
        {KIND_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeKind === tab.value}
            onClick={() => setParam("kind", tab.value === "all" ? null : tab.value)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-body-sm font-medium transition-colors ${
              activeKind === tab.value
                ? "border-globanic-blue text-globanic-navy"
                : "border-transparent text-slate-500 hover:text-globanic-navy"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Resource-specific sub-filters — only relevant when browsing resources */}
      {(activeKind === "all" || activeKind === "resources") && (
        <div className="flex flex-wrap items-center gap-2 py-3">
          <select
            aria-label={t("resourceTypeLabel")}
            value={searchParams.get("type") ?? ""}
            onChange={(e) => setParam("type", e.target.value || null)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-body-sm text-globanic-navy"
          >
            <option value="">{t("allTypes")}</option>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {domainOptions.length > 0 && (
            <select
              aria-label={t("academicDomainLabel")}
              value={searchParams.get("domain") ?? ""}
              onChange={(e) => setParam("domain", e.target.value || null)}
              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-body-sm text-globanic-navy"
            >
              <option value="">{t("allDomains")}</option>
              {domainOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}

          {universityOptions.length > 0 && (
            <select
              aria-label={t("universityLabel")}
              value={searchParams.get("university") ?? ""}
              onChange={(e) => setParam("university", e.target.value || null)}
              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-body-sm text-globanic-navy"
            >
              <option value="">{t("allUniversities")}</option>
              {universityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}

          {languageOptions.length > 0 && (
            <select
              aria-label={tCommon("language")}
              value={searchParams.get("language") ?? ""}
              onChange={(e) => setParam("language", e.target.value || null)}
              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-body-sm text-globanic-navy"
            >
              <option value="">{t("allLanguages")}</option>
              {languageOptions.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          )}

          <select
            aria-label={t("sortLabel")}
            value={searchParams.get("sort") ?? "relevance"}
            onChange={(e) => setParam("sort", e.target.value === "relevance" ? null : e.target.value)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-body-sm text-globanic-navy"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                const params = new URLSearchParams();
                const q = searchParams.get("q");
                if (q) params.set("q", q);
                if (activeKind !== "all") params.set("kind", activeKind);
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="text-body-sm font-medium text-globanic-blue hover:underline"
            >
              {t("clearFilters")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
