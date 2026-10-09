import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    title: dict.legalCopyright.pageTitle,
    description: dict.legalCopyright.metaDescription,
    path: "/legal/copyright",
  });
}

export default async function CopyrightPage() {
  const dict = await getDictionary(await getLocale());
  const t = dict.legalCopyright;

  return (
    <article>
      <h1 className="mb-2 font-serif text-h1 font-semibold text-globanic-navy">{t.pageTitle}</h1>
      <p className="mb-8 text-body-sm text-slate-500">{t.intro}</p>

      <div className="space-y-8 text-body leading-relaxed text-slate-700">
        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section1Heading}</h2>
          <p>{t.section1Body}</p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section2Heading}</h2>
          <p>
            {t.section2BodyPrefix}{" "}
            <Link href="/publisher-guidelines" className="font-medium text-globanic-blue hover:underline">
              {dict.publisherGuidelines.pageTitle}
            </Link>{" "}
            {t.section2BodySuffix}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section3Heading}</h2>
          <p>
            {t.section3BodyPrefix}{" "}
            <span className="font-medium text-globanic-navy">
              «{dict.resource.reportThisResourceButton}»
            </span>{" "}
            {t.section3BodyMiddle}{" "}
            <span className="font-medium text-globanic-navy">«{dict.resource.reportTypeCopyright}»</span>
            {t.section3BodySuffix}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section4Heading}</h2>
          <p>{t.section4Intro}</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>{t.section4Item1}</li>
            <li>{t.section4Item2}</li>
            <li>{t.section4Item3}</li>
            <li>{t.section4Item4}</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section5Heading}</h2>
          <p>
            {t.section5BodyPrefix}{" "}
            <Link href="/contact" className="font-medium text-globanic-blue hover:underline">
              {t.contactPageLinkText}
            </Link>
            {t.section5BodySuffix}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section6Heading}</h2>
          <p>{t.section6Body}</p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section7Heading}</h2>
          <p>{t.section7Body}</p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section8Heading}</h2>
          <p>
            {t.section8BodyPrefix}{" "}
            <Link href="/contact" className="font-medium text-globanic-blue hover:underline">
              {t.contactPageLinkText}
            </Link>
            {t.section8BodySuffix}
          </p>
        </section>
      </div>
    </article>
  );
}
