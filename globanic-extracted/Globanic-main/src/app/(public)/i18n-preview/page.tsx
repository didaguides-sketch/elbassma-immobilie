import type { Metadata } from "next";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LOCALE_DIRECTION, LOCALE_LABEL } from "@/lib/i18n/config";
import { formatDate, formatNumber, formatCurrency } from "@/lib/i18n/format";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Phase 16A — i18n architecture preview",
  description: "Internal proof-of-architecture page for the internationalization foundation.",
  path: "/i18n-preview",
  noindex: true,
});

export default async function I18nPreviewPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.i18nPreview;
  const tNav = dict.nav;

  const [session, sampleResource] = await Promise.all([
    auth(),
    // Real data only: whatever the actual most-recent resource is, with
    // its actual (possibly null) `language` field — never a fabricated
    // "French article". This is the concrete proof that UI locale and
    // Resource.language are unrelated: this title and its language tag
    // do not change no matter which of the four LOCALE_LABEL buttons
    // below is active.
    prisma.resource.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: { title: true, language: true },
    }),
  ]);

  const storedPreference = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferredLocale: true },
      })
    : null;

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-h1 font-semibold text-globanic-navy">{t.title}</h1>
          <LanguageSwitcher />
        </div>

        <p className="mb-8 text-body leading-relaxed text-slate-700">{t.description}</p>

        <dl className="mb-8 grid grid-cols-1 gap-3 rounded border border-slate-200 bg-white p-5 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{t.currentLocale}</dt>
            <dd className="font-medium text-globanic-navy">{LOCALE_LABEL[locale]} ({locale})</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.direction}</dt>
            <dd className="font-medium text-globanic-navy">{LOCALE_DIRECTION[locale]}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.exampleDate}</dt>
            <dd className="font-medium text-globanic-navy">{formatDate(new Date(), locale)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.exampleNumber}</dt>
            <dd className="font-medium text-globanic-navy">{formatNumber(1234567.89, locale)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">{t.exampleCurrency}</dt>
            <dd className="font-medium text-globanic-navy">{formatCurrency(450075, "DZD", locale)}</dd>
          </div>
        </dl>

        <div className="mb-8 rounded border border-slate-200 bg-white p-5">
          <p className="mb-2 text-body-sm font-semibold text-slate-700">{tNav.account} / {tNav.login}</p>
          {session?.user ? (
            <p className="text-body-sm text-slate-600">
              {t.loggedInAs}: {session.user.email}
              <br />
              {t.storedPreference}:{" "}
              <span className="font-medium text-globanic-navy">
                {storedPreference?.preferredLocale ?? t.noStoredPreference}
              </span>
            </p>
          ) : (
            <p className="text-body-sm text-slate-500">{t.notLoggedIn}</p>
          )}
        </div>

        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-5">
          <p className="mb-2 text-body-sm font-semibold text-slate-700">{t.contentLanguageNote}</p>
          {sampleResource ? (
            <p className="text-body-sm text-slate-600">
              {sampleResource.title} — <span dir="ltr" className="font-mono text-caption">language: {sampleResource.language ?? "—"}</span>
            </p>
          ) : (
            <p className="text-body-sm text-slate-400">
              لا يوجد أي مورد منشور بعد لعرضه هنا. / No published resource exists yet to display here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
