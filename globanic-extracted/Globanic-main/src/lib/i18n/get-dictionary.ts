// Server-only by convention (like every other file under src/server and
// src/lib that reads the filesystem/DB directly) — this codebase does
// not use the `server-only` package anywhere, so this file doesn't
// introduce it either; it is simply never imported from a "use client"
// file, same discipline already applied to every service in
// src/server/services.
import ar from "./dictionaries/ar.json";
import fr from "./dictionaries/fr.json";
import en from "./dictionaries/en.json";
import es from "./dictionaries/es.json";
import { DEFAULT_LOCALE, type UiLocale } from "./config";

/**
 * `ar.json` is the canonical shape — every other dictionary must
 * structurally match it. This is checked two ways:
 *  1. At build/type-check time via the `satisfies Dictionary` below on
 *     each non-Arabic file (a key renamed/removed/added in one locale
 *     without the others becomes a TypeScript error, not a silent
 *     runtime gap).
 *  2. Defensively at runtime in `getDictionary`'s fallback merge, for
 *     the case where a key exists structurally but is legitimately
 *     still untranslated (empty string) during incremental rollout —
 *     not something that should happen with the current 4 catalogs
 *     (verified identical), but the mechanism exists for when this
 *     grows past a small proof-of-architecture set.
 */
export type Dictionary = typeof ar;

fr satisfies Dictionary;
en satisfies Dictionary;
es satisfies Dictionary;

const DICTIONARIES: Record<UiLocale, Dictionary> = { ar, fr, en, es };

/**
 * Fallback policy (Phase 16A, Section 13):
 *  - A locale outside SUPPORTED_LOCALES never reaches this function
 *    (see get-locale.ts's `toUiLocale`), so there is no "unknown
 *    locale" case to handle here.
 *  - A missing/empty leaf value within an otherwise-present locale
 *    falls back to the SAME key in the default locale (`ar`), not to
 *    an empty string and not to a raw key name — a half-translated
 *    catalog must never surface blank UI or an implementation detail
 *    like "i18nPreview.title" to a visitor.
 *  - In development, a fallback is logged with `console.warn` so a
 *    missing key is visible during work rather than only in
 *    production telemetry. In production it is silent — a warning log
 *    written on every request for a known content gap is noise, not
 *    signal, exactly as instructed ("do not silently produce broken
 *    UI" is about the user-facing result, not about mandating
 *    production log volume).
 *  - This must NEVER be reached for legal/financial keys without the
 *    fallback being immediately obvious in review: because the
 *    fallback is always the DEFAULT locale's real, reviewed string
 *    (never a placeholder, never blank), a fallback cannot silently
 *    change legal/financial meaning to something ungoverned — worst
 *    case, a financial label temporarily shows in Arabic inside an
 *    otherwise-French page, which is visible and reviewable, not a
 *    silent corruption of meaning.
 */
function withFallback(locale: UiLocale, dict: Dictionary): Dictionary {
  if (locale === DEFAULT_LOCALE) return dict;

  const fallback = DICTIONARIES[DEFAULT_LOCALE];
  const merged: Record<string, unknown> = {};

  for (const namespace of Object.keys(fallback) as (keyof Dictionary)[]) {
    const merged_ns: Record<string, string> = { ...fallback[namespace] };
    for (const [key, value] of Object.entries(dict[namespace])) {
      if (value) {
        merged_ns[key] = value;
      } else if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] missing "${String(namespace)}.${key}" for locale "${locale}", falling back to "${DEFAULT_LOCALE}"`);
      }
    }
    merged[namespace as string] = merged_ns;
  }

  return merged as Dictionary;
}

/** Server-only: `getLocale()` -> `getDictionary(locale)`. Never call from a Client Component. */
export async function getDictionary(locale: UiLocale): Promise<Dictionary> {
  return withFallback(locale, DICTIONARIES[locale]);
}
