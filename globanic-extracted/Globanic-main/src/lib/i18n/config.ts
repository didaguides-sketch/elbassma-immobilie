/**
 * Phase 16A — canonical locale model.
 *
 * This is the ONE source of truth for which UI locales Globanic
 * supports and how each behaves. Nothing else in the codebase should
 * define a competing list of locales, a competing direction map, or a
 * competing default. Anything that needs this information imports it
 * from here.
 *
 * This describes the INTERFACE language only — navigation, buttons,
 * forms, dashboards, system messages. It has nothing to do with
 * `Resource.language`, which describes what language an academic
 * document is written in and is never touched by anything in this
 * directory. A French article stays a French article no matter what
 * `Locale` the viewer's interface is set to.
 */

export const SUPPORTED_LOCALES = ["ar", "fr", "en", "es"] as const;

export type UiLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * "ar" is the default because it is what the product already is today
 * (verified directly against the source in the Phase 16 audit: the
 * large majority of existing UI copy is Arabic, and the document has
 * been `lang="ar" dir="rtl"` since the Phase 1 foundation fix). Adding
 * fr/en/es support does not change what a visitor sees today unless
 * they explicitly switch — this is additive, not a migration of the
 * existing product's default identity.
 */
export const DEFAULT_LOCALE: UiLocale = "ar";

export function isUiLocale(value: string | undefined | null): value is UiLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Normalizes any input to a supported UiLocale, falling back to the default. */
export function toUiLocale(value: string | undefined | null): UiLocale {
  return isUiLocale(value) ? value : DEFAULT_LOCALE;
}

export const LOCALE_DIRECTION: Record<UiLocale, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr",
  es: "ltr",
};

/** Native-name labels for use in the language switcher — always shown in their own language. */
export const LOCALE_LABEL: Record<UiLocale, string> = {
  ar: "العربية",
  fr: "Français",
  en: "English",
  es: "Español",
};

/**
 * BCP-47 tags used to drive `Intl`-based formatting (dates, numbers,
 * currency). These are a formatting-locale choice, deliberately
 * separate from the UI-locale key itself, because "which country's
 * number/date conventions" is a slightly different question than
 * "which language is the interface in" — e.g. Arabic-speaking users of
 * an Algeria-first product are better served by ar-DZ's conventions
 * than a generic ar tag's. Every one of these can be changed later
 * without touching the UiLocale type itself.
 */
export const LOCALE_TO_INTL_TAG: Record<UiLocale, string> = {
  ar: "ar-DZ",
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
};

export const LOCALE_COOKIE_NAME = "globanic_locale";
