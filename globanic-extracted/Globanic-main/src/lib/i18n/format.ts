import { LOCALE_TO_INTL_TAG, type UiLocale } from "./config";

/**
 * Presentation-only formatting utilities, built on `Intl` (no new
 * dependency). None of these change, round, or reinterpret an
 * underlying value — they only decide how it's displayed. Existing call
 * sites that already hardcode "fr-FR"/"ar-DZ" (documented in the Phase
 * 16 audit) are NOT retrofitted to use these in this phase — that
 * migration is exactly the kind of broad, mechanical, page-by-page
 * change Phase 16A's own rules defer ("prove the architecture... do not
 * translate/convert the entire application yet"). These exist so that
 * migration can happen incrementally, call site by call site, in 16B
 * without re-solving the formatting question each time.
 */

export function formatDate(date: Date | string, locale: UiLocale, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE_TO_INTL_TAG[locale], options ?? { dateStyle: "medium" }).format(d);
}

export function formatNumber(value: number, locale: UiLocale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALE_TO_INTL_TAG[locale], options).format(value);
}

export function formatPercent(value: number, locale: UiLocale): string {
  return new Intl.NumberFormat(LOCALE_TO_INTL_TAG[locale], { style: "percent", maximumFractionDigits: 1 }).format(value);
}

/**
 * `amountCents`/`currency` are exactly what every payout/earnings
 * record already stores (see payout.service.ts) — this only decides
 * how that exact, unmodified value is displayed per locale (symbol
 * placement, decimal/thousands separators). It never touches the
 * stored cents value or the currency code itself.
 */
export function formatCurrency(amountCents: number, currency: string, locale: UiLocale): string {
  return new Intl.NumberFormat(LOCALE_TO_INTL_TAG[locale], {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(amountCents / 100);
}
