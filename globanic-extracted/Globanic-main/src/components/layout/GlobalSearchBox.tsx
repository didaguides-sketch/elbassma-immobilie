"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { suggestSearchAction, type SearchSuggestion } from "@/server/actions/search-suggest.actions";
import { resourceTypeToUrlSegment } from "@/lib/utils/resource-type";
import { useTranslations } from "@/components/i18n/I18nProvider";

function suggestionHref(item: SearchSuggestion): string {
  if (item.kind === "resource") return `/resources/${resourceTypeToUrlSegment(item.type)}/${item.slug}`;
  if (item.kind === "university") return `/universities/${item.slug}`;
  return `/authors/${item.slug}`;
}

/**
 * Header search — real submit-to-/search form (works without JS) plus a
 * debounced typeahead spanning Resources, Universities, and Authors
 * (see search-suggest.actions.ts) — all real backend data, no fabricated
 * suggestions. Implements combobox keyboard behavior (Up/Down/Enter/
 * Escape, aria-activedescendant) since the Phase 2 version only closed
 * on Escape/click-outside with no arrow-key navigation — a real
 * accessibility gap this phase is explicitly asked to close.
 */
export function GlobalSearchBox({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const inputId = useId();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const t = useTranslations("search");

  const KIND_LABEL: Record<SearchSuggestion["kind"], string> = {
    resource: t("kindResource"),
    university: t("kindUniversity"),
    author: t("kindAuthor"),
  };

  const activeId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await suggestSearchAction(value);
        setSuggestions(result.items);
        setOpen(true);
      });
    }, 250);
  }

  function goToResults(q: string) {
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      router.push(suggestionHref(suggestions[activeIndex]));
      setOpen(false);
      return;
    }
    goToResults(query);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  }

  const grouped = useMemo(() => {
    const groups: Record<SearchSuggestion["kind"], SearchSuggestion[]> = { resource: [], university: [], author: [] };
    for (const item of suggestions) groups[item.kind].push(item);
    return groups;
  }, [suggestions]);

  let flatIndex = -1;

  return (
    <div ref={containerRef} className="relative w-full">
      <form action="/search" method="get" onSubmit={handleSubmit} role="search" className="relative">
        <label htmlFor={inputId} className="sr-only">
          {t("searchLabel")}
        </label>
        <svg aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          id={inputId}
          name="q"
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && suggestions.length > 0 && setOpen(true)}
          placeholder={t("placeholder")}
          className={`w-full rounded border border-slate-300 bg-white ps-9 pe-3 text-body-sm text-globanic-navy placeholder:text-slate-400 ${compact ? "h-9" : "h-11"}`}
        />
      </form>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={t("suggestionsLabel")}
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-96 overflow-auto rounded-md border border-slate-200 bg-white shadow-raised"
        >
          {isPending && <p className="px-4 py-3 text-body-sm text-slate-400">{t("searching")}</p>}

          {!isPending && suggestions.length === 0 && (
            <p className="px-4 py-3 text-body-sm text-slate-400">{t("noResults", { query })}</p>
          )}

          {!isPending &&
            (["resource", "university", "author"] as const).map((kind) =>
              grouped[kind].length === 0 ? null : (
                <div key={kind}>
                  <p className="px-4 pt-2.5 text-caption font-semibold uppercase tracking-wide text-slate-400">
                    {kind === "resource" ? t("groupResources") : kind === "university" ? t("groupUniversities") : t("groupAuthors")}
                  </p>
                  {grouped[kind].map((item) => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    return (
                      <Link
                        key={`${item.kind}-${item.id}`}
                        id={`${listboxId}-option-${idx}`}
                        role="option"
                        aria-selected={activeIndex === idx}
                        href={suggestionHref(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => setOpen(false)}
                        className={`block border-b border-slate-100 px-4 py-2.5 last:border-b-0 ${activeIndex === idx ? "bg-slate-50" : "hover:bg-slate-50"}`}
                      >
                        <p className="text-body-sm font-medium text-globanic-navy">{item.title}</p>
                        <p className="text-caption text-slate-500">
                          {KIND_LABEL[item.kind]}
                          {item.kind === "resource" && item.universityName ? ` · ${item.universityName}` : ""}
                          {item.kind === "university" && item.location ? ` · ${item.location}` : ""}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ),
            )}

          {!isPending && suggestions.length > 0 && (
            <button
              type="button"
              onClick={() => goToResults(query)}
              className="block w-full px-4 py-2.5 text-start text-body-sm font-semibold text-globanic-blue hover:bg-slate-50"
            >
              {t("viewAllResults", { query })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
