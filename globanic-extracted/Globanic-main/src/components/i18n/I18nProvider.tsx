"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { UiLocale } from "@/lib/i18n/config";

type I18nContextValue = { locale: UiLocale; dict: Dictionary };

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Wraps the app once, at the root layout, with the SAME locale and
 * dictionary the Server Components in the same request already
 * resolved (passed down as props — never re-detected independently on
 * the client, which would risk it disagreeing with what the server
 * just rendered). Client Components anywhere below this can then call
 * `useTranslations()`/`useLocale()` instead of needing the dictionary
 * threaded through every prop chain by hand.
 */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: UiLocale;
  dict: Dictionary;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, dict }}>{children}</I18nContext.Provider>;
}

function useI18nContext(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslations()/useLocale() must be used within <I18nProvider>.");
  }
  return ctx;
}

export function useLocale(): UiLocale {
  return useI18nContext().locale;
}

/**
 * `useTranslations("nav")` -> `t("home")` -> the string at
 * `dict.nav.home` for the current locale. Namespaced rather than one
 * flat lookup, matching the catalog structure in Section 12 of the
 * Phase 16A brief and mirroring next-intl's own `useTranslations(ns)`
 * shape deliberately — if the team adopts next-intl in a future phase,
 * call sites written against this hook need only change the import,
 * not their calling convention.
 *
 * Phase 16B, Batch 1: extended (not replaced) with minimal `{param}`
 * interpolation — e.g. `t("noResults", { query })` substitutes
 * `{query}` in the dictionary string. This is the same hook, not a
 * second mechanism: a component with no dynamic values still calls
 * `t("key")` exactly as before (the `params` argument is optional),
 * and next-intl's own `t(key, values)` shape is the same two-argument
 * pattern, so this doesn't move away from the future-migration intent
 * either.
 */
export function useTranslations<NS extends keyof Dictionary>(namespace: NS) {
  const { dict } = useI18nContext();
  const strings = dict[namespace];
  return function t(key: keyof Dictionary[NS] & string, params?: Record<string, string | number>): string {
    const raw = strings[key];
    if (!params) return raw;
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
      raw,
    );
  };
}
