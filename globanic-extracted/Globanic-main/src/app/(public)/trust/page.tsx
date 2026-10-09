import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    title: dict.trust.pageTitle,
    description: dict.trust.metaDescription,
    path: "/trust",
  });
}

export default async function TrustPage() {
  const dict = await getDictionary(await getLocale());
  const t = dict.trust;

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <h1 className="mb-2 font-serif text-h1 font-semibold text-globanic-navy">
          {t.pageTitle}
        </h1>
        <p className="mb-8 text-body leading-relaxed text-slate-700">{t.intro}</p>

        <div className="space-y-8 text-body leading-relaxed text-slate-700">
          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section1Heading}</h2>
            <p>
              {t.section1BodyPrefix}{" "}
              <Link href="/publisher-guidelines" className="font-medium text-globanic-blue hover:underline">
                {dict.publisherGuidelines.pageTitle}
              </Link>
              {t.section1BodySuffix}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section2Heading}</h2>
            <p>{t.section2Body}</p>
          </section>

          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{t.section3Heading}</h2>
            <p>
              {t.section3BodyPrefix}{" "}
              <Link href="/legal/copyright" className="font-medium text-globanic-blue hover:underline">
                {t.copyrightPageLinkText}
              </Link>{" "}
              {t.section3BodySuffix}
            </p>
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
            <p>
              {t.section8BodyPrefix}{" "}
              <Link href="/about" className="font-medium text-globanic-blue hover:underline">
                {t.aboutPageLinkText}
              </Link>
              {t.section8BodySuffix}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
