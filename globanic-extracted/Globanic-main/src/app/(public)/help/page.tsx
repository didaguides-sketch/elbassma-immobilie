import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    title: dict.help.pageTitle,
    description: dict.help.metaDescription,
    path: "/help",
  });
}

type FaqItem = { q: string; a: ReactNode };

function buildFaqs(dict: Dictionary): FaqItem[] {
  const t = dict.help;
  return [
    {
      q: t.faq1Q,
      a: (
        <>
          {t.faq1APrefix}{" "}
          <Link href="/about" className="font-medium text-globanic-blue hover:underline">
            {t.aboutPageLinkText}
          </Link>
          {t.faq1ASuffix}
        </>
      ),
    },
    {
      q: t.faq2Q,
      a: (
        <>
          {t.faq2APrefix}{" "}
          <Link href="/search" className="font-medium text-globanic-blue hover:underline">
            {dict.search.formLabel}
          </Link>{" "}
          {t.faq2AMiddle}
        </>
      ),
    },
    {
      q: t.faq3Q,
      a: t.faq3A,
    },
    {
      q: t.faq4Q,
      a: (
        <>
          {t.faq4APrefix}{" "}
          <Link href="/register" className="font-medium text-globanic-blue hover:underline">
            {dict.nav.createAccount}
          </Link>
          {t.faq4ASuffix}
        </>
      ),
    },
    {
      q: t.faq5Q,
      a: (
        <>
          {t.faq5APrefix}{" "}
          <span className="font-medium text-globanic-navy">&quot;{dict.nav.account}&quot;</span>
          {t.faq5ASuffix}
        </>
      ),
    },
    {
      q: t.faq6Q,
      a: (
        <>
          {t.faq6APrefix}{" "}
          <Link href="/publisher/apply" className="font-medium text-globanic-blue hover:underline">
            {dict.publisherGuidelines.applyLinkText}
          </Link>
          {t.faq6ASuffix}
        </>
      ),
    },
    {
      q: t.faq7Q,
      a: (
        <>
          {t.faq7APrefix}{" "}
          <Link href="/publisher-guidelines" className="font-medium text-globanic-blue hover:underline">
            {dict.publisherGuidelines.pageTitle}
          </Link>
          {t.faq7ASuffix}
        </>
      ),
    },
    {
      q: t.faq8Q,
      a: t.faq8A,
    },
    {
      q: t.faq9Q,
      a: t.faq9A,
    },
    {
      q: t.faq10Q,
      a: t.faq10A,
    },
    {
      q: t.faq11Q,
      a: (
        <>
          {t.faq11APrefix}{" "}
          <Link href="/contact" className="font-medium text-globanic-blue hover:underline">
            {dict.legalTerms.contactPageLinkText}
          </Link>{" "}
          {t.faq11ASuffix}
        </>
      ),
    },
    {
      q: t.faq12Q,
      a: (
        <>
          {t.faq12ABodyPrefix}{" "}
          <span className="font-medium text-globanic-navy">&quot;{dict.resource.reportThisResourceButton}&quot;</span>{" "}
          {t.faq12ABodyMiddle}{" "}
          <span className="font-medium text-globanic-navy">&quot;{dict.resource.reportTypeCopyright}&quot;</span>{" "}
          {t.faq12ABodyMiddle2}{" "}
          <Link href="/legal/copyright" className="font-medium text-globanic-blue hover:underline">
            {dict.trust.copyrightPageLinkText}
          </Link>
          {t.faq12ABodySuffix}
        </>
      ),
    },
  ];
}

export default async function HelpPage() {
  const dict = await getDictionary(await getLocale());
  const FAQS = buildFaqs(dict);

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <h1 className="mb-6 font-serif text-h1 font-semibold text-globanic-navy">{dict.help.pageTitle}</h1>
        <p className="mb-8 text-body leading-relaxed text-slate-700">
          {dict.help.introPrefix}{" "}
          <Link href="/contact" className="font-medium text-globanic-blue hover:underline">
            {dict.help.contactUsLinkText}
          </Link>
          {dict.help.introSuffix}
        </p>

        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {FAQS.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="cursor-pointer list-none text-body-lg font-medium text-globanic-navy marker:content-none">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-slate-400 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <div className="mt-3 text-body leading-relaxed text-slate-700">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
