import { cookies } from "next/headers";
import { auth } from "@/server/auth/auth";
import { LOCALE_COOKIE_NAME, isUiLocale, toUiLocale, type UiLocale } from "./config";

/**
 * Resolves the UI locale for the current request/render.
 *
 * Deliberately cookie-first, not URL-based (see the final report's "URL
 * strategy" section for why path-prefixed locale routing was NOT
 * chosen: it would require rewriting or redirecting every existing
 * public URL, resource page, and — most importantly — every
 * already-shared `/p/[code]` publisher referral link, for a product
 * that does not yet have a single translated page of real content). No
 * URL is inspected or altered here.
 *
 * Resolution order (Phase 16A, Review 1):
 *  1. The `globanic_locale` cookie — authoritative once set on this
 *     device, for anonymous and authenticated visitors alike.
 *  2. The authenticated session's `locale` claim (from the JWT —
 *     ultimately sourced from `User.preferredLocale`, see auth.ts) —
 *     covers a fresh device/browser with no cookie yet, the instant
 *     login completes, with zero extra DB query (the claim rides the
 *     same per-request re-validation query auth.ts's `jwt` callback
 *     already performs). This is read-only here; nothing in this file
 *     writes to the session or touches authorization.
 *  3. `DEFAULT_LOCALE` ("ar").
 */
export async function getLocale(): Promise<UiLocale> {
  const store = cookies();
  const cookieValue = store.get(LOCALE_COOKIE_NAME)?.value;
  if (isUiLocale(cookieValue)) return cookieValue;

  const session = await auth();
  return toUiLocale(session?.user.locale);
}
