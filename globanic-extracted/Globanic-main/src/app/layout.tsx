import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { getSiteUrl } from "@/lib/utils/site-url";
import { fontVariables } from "./fonts";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LOCALE_DIRECTION } from "@/lib/i18n/config";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Globanic — La connaissance à portée de main",
    template: "%s | Globanic",
  },
  description:
    "Plateforme académique pour publier et découvrir cours, mémoires, articles, thèses et livres.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Phase 16A: lang/dir are now derived from the resolved UI locale
  // (cookie-based, defaulting to "ar" — see src/lib/i18n/get-locale.ts)
  // instead of being hardcoded. The Phase 1 fix documented below is
  // still the reason "ar"/"rtl" is the DEFAULT — nothing about that
  // history changed, only that it's no longer the only possible value.
  //
  // Historical note (Phase 1): the original lang="fr" dir="ltr" did not
  // match reality — the large majority of this app's actual UI copy is
  // Arabic — so declaring French/LTR meant every Arabic string in the
  // product was rendered and read by assistive tech under the wrong
  // language and direction. That was a correctness fix, not a design
  // opinion, and remains why "ar" is DEFAULT_LOCALE today.
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <html lang={locale} dir={LOCALE_DIRECTION[locale]} className={fontVariables}>
      <body className="min-h-screen bg-white font-sans text-globanic-navy antialiased">
        <Providers>
          <I18nProvider locale={locale} dict={dict}>
            {children}
          </I18nProvider>
        </Providers>
      </body>
    </html>
  );
}
