import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    title: dict.legalPrivacy.pageTitle,
    description: dict.legalPrivacy.metaDescription,
    path: "/legal/privacy",
  });
}

export default async function PrivacyPage() {
  const dict = await getDictionary(await getLocale());
  const t = dict.legalPrivacy;

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
          <p>{t.section2Body}</p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section3Heading}</h2>
          <p>{t.section3Body}</p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section4Heading}</h2>
          <p>{t.section4Body}</p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section5Heading}</h2>
          <p>{t.section5Body}</p>
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
          <p>{t.section8Body}</p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section9Heading}</h2>
          <p>{t.section9Body}</p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section10Heading}</h2>
          <p>{t.section10Body}</p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section11Heading}</h2>
          <p>{t.section11Body}</p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section12Heading}</h2>
          <p>
            {t.section12BodyPrefix}{" "}
            <Link href="/contact" className="font-medium text-globanic-blue hover:underline">
              {t.contactPageLinkText}
            </Link>
            {t.section12BodySuffix}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section13Heading}</h2>
          <p>
            {t.section13BodyPrefix}{" "}
            <Link href="/contact" className="font-medium text-globanic-blue hover:underline">
              {t.contactPageLinkText}
            </Link>
            {t.section13BodySuffix}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section14Heading}</h2>
          <p>{t.section14Body}</p>
        </section>
      </div>
    </article>
  );
}
