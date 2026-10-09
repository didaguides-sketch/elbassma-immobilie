import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    title: dict.about.pageTitle,
    description: dict.about.metaDescription,
    path: "/about",
  });
}

export default async function AboutPage() {
  const dict = await getDictionary(await getLocale());
  const t = dict.about;

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <h1 className="mb-6 font-serif text-h1 font-semibold text-globanic-navy">{t.pageTitle}</h1>

        <p className="mb-6 font-serif text-body-lg leading-relaxed text-slate-700">
          {t.intro}
        </p>

        <section className="mb-10">
          <h2 className="mb-3 text-h4 font-semibold text-globanic-navy">{t.offerHeading}</h2>
          <p className="mb-3 text-body leading-relaxed text-slate-700">
            {t.offerBodyPart1Prefix}{" "}
            <Link href="/resources" className="font-medium text-globanic-blue hover:underline">
              {t.publishedResourcesLinkText}
            </Link>{" "}
            {t.offerBodyPart1Middle}{" "}
            <Link href="/universities" className="font-medium text-globanic-blue hover:underline">
              {t.universityLinkText}
            </Link>
            {dict.common.listSeparator}
            <Link href="/domains" className="font-medium text-globanic-blue hover:underline">
              {t.domainLinkText}
            </Link>{" "}
            {t.orConjunction}{" "}
            <Link href="/authors" className="font-medium text-globanic-blue hover:underline">
              {t.authorLinkText}
            </Link>
            {t.offerBodyPart1Suffix}
          </p>
          <p className="text-body leading-relaxed text-slate-700">
            {t.offerBodyPart2Prefix}{" "}
            <Link href="/trust" className="font-medium text-globanic-blue hover:underline">
              {dict.trust.pageTitle}
            </Link>{" "}
            {t.offerBodyPart2Middle}
            <Link href="/publisher-guidelines" className="font-medium text-globanic-blue hover:underline">
              {" "}
              {dict.publisherGuidelines.pageTitle}
            </Link>
            {t.offerBodyPart2Suffix}
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-h4 font-semibold text-globanic-navy">{t.whoHeading}</h2>
          <ul className="space-y-2 text-body leading-relaxed text-slate-700">
            <li>
              <span className="font-medium text-globanic-navy">{t.whoStudentsLabel}</span> {t.whoStudentsBody}
            </li>
            <li>
              <span className="font-medium text-globanic-navy">{t.whoPublishersLabel}</span> {t.whoPublishersBody}
            </li>
            <li>
              <span className="font-medium text-globanic-navy">{t.whoUniversitiesLabel}</span> {t.whoUniversitiesBody}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-h4 font-semibold text-globanic-navy">{t.whereHeading}</h2>
          <p className="text-body leading-relaxed text-slate-700">
            {t.whereBodyPrefix}{" "}
            <Link href="/help" className="font-medium text-globanic-blue hover:underline">
              {t.helpPageLinkText}
            </Link>
            {t.whereBodySuffix}{" "}
            <Link href="/contact" className="font-medium text-globanic-blue hover:underline">
              {t.contactUsLinkText}
            </Link>
            {t.whereBodyEnd}
          </p>
        </section>
      </div>
    </div>
  );
}
