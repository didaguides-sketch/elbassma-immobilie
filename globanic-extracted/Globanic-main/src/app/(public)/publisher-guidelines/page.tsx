import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    title: dict.publisherGuidelines.pageTitle,
    description: dict.publisherGuidelines.metaDescription,
    path: "/publisher-guidelines",
  });
}

export default async function PublisherGuidelinesPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const g = dict.publisherGuidelines;

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <h1 className="mb-2 font-serif text-h1 font-semibold text-globanic-navy">{g.pageTitle}</h1>
        <p className="mb-8 text-body leading-relaxed text-slate-700">
          {g.intro}{" "}
          <Link href="/publisher/apply" className="font-medium text-globanic-blue hover:underline">
            {g.applyLinkText}
          </Link>
          .
        </p>

        <div className="space-y-8 text-body leading-relaxed text-slate-700">
          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{g.section1Heading}</h2>
            <p>{g.section1Body}</p>
          </section>

          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{g.section2Heading}</h2>
            <p>{g.section2Body}</p>
          </section>

          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">
              {g.section3Heading}
            </h2>
            <p>
              {g.section3BodyPrefix}{" "}
              <Link href="/legal/copyright" className="font-medium text-globanic-blue hover:underline">
                {g.copyrightLinkText}
              </Link>{" "}
              {g.section3BodySuffix}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{g.section4Heading}</h2>
            <p>{g.section4Body}</p>
          </section>

          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">
              {g.section5Heading}
            </h2>
            <ul className="list-inside list-disc space-y-1">
              <li>{g.section5Item1}</li>
              <li>{g.section5Item2}</li>
              <li>{g.section5Item3}</li>
              <li>{g.section5Item4}</li>
              <li>{g.section5Item5}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{g.section6Heading}</h2>
            <p>{g.section6Body}</p>
          </section>

          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">
              {g.section7Heading}
            </h2>
            <p>{g.section7Body}</p>
          </section>

          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{g.section8Heading}</h2>
            <p>{g.section8Body}</p>
          </section>

          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">
              {g.section9Heading}
            </h2>
            <p>{g.section9Body}</p>
          </section>

          <section>
            <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{g.section10Heading}</h2>
            <p>{g.section10Body}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
