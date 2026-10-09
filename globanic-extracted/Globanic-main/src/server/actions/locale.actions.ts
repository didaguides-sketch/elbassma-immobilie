"use server";

import { cookies } from "next/headers";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/lib/prisma";
import { LOCALE_COOKIE_NAME, isUiLocale, type UiLocale } from "@/lib/i18n/config";

/**
 * Phase 16A: the only place `preferredLocale` is ever written, and the
 * only place the locale cookie is ever written from application code.
 *
 * This deliberately does NOT touch `src/server/auth/*` or any RBAC
 * check — locale is never an authorization input (see the `Locale`
 * enum's own schema comment). Any signed-in user may call this for
 * their own account; there is nothing here to restrict by role because
 * there is nothing sensitive to protect — this is a personal UI
 * preference, not a permission.
 *
 * Sets the cookie unconditionally (works for anonymous visitors too),
 * and additionally persists to `User.preferredLocale` when a session
 * exists — the durable, cross-device half of the design. See
 * get-locale.ts's docblock for the current, documented limitation: a
 * fresh session with no cookie does not yet auto-apply this stored
 * value (deferred to 16B).
 */
export async function setPreferredLocaleAction(locale: string): Promise<{ success: boolean }> {
  if (!isUiLocale(locale)) {
    return { success: false };
  }

  const typedLocale: UiLocale = locale;

  cookies().set(LOCALE_COOKIE_NAME, typedLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferredLocale: typedLocale },
    });
  }

  return { success: true };
}
