"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_LOCALES, LOCALE_LABEL } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider";
import { setPreferredLocaleAction } from "@/server/actions/locale.actions";

/**
 * Phase 16A reusable switcher — one implementation, usable from public,
 * student, publisher, or admin surfaces alike (no per-area variant).
 *
 * Deliberately does NOT navigate anywhere: because Phase 16A chose
 * cookie-based locale (no URL prefix — see get-locale.ts), the current
 * route, its dynamic params, and any query string are untouched by
 * switching language. `router.refresh()` re-runs the current route's
 * Server Components against the newly-set cookie, which is what
 * actually changes the rendered language — this is what satisfies
 * "preserve the current page / preserve query parameters" without any
 * bespoke per-route logic.
 */
export function LanguageSwitcher() {
  const current = useLocale();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("common");

  function handleSelect(locale: string) {
    if (locale === current) return;
    startTransition(async () => {
      await setPreferredLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("language")}>
      {SUPPORTED_LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => handleSelect(locale)}
          disabled={pending}
          aria-pressed={locale === current}
          className={`rounded px-2 py-1 text-caption font-semibold transition disabled:opacity-50 ${
            locale === current
              ? "bg-globanic-navy text-white"
              : "text-slate-500 hover:bg-slate-100 hover:text-globanic-navy"
          }`}
        >
          {LOCALE_LABEL[locale]}
        </button>
      ))}
    </div>
  );
}
