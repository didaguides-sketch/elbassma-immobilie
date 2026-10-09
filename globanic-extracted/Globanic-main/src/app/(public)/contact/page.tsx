import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    title: dict.contact.pageTitle,
    description: dict.contact.metaDescription,
    path: "/contact",
  });
}

function buildCategories(dict: Dictionary) {
  return [
    {
      title: dict.contact.generalInquiryTitle,
      description: dict.contact.generalInquiryDesc,
    },
    {
      title: dict.contact.joinPublisherTitle,
      description: dict.contact.joinPublisherDesc,
      link: { href: "/publisher/apply", label: dict.contact.applyAsPublisherLinkText },
    },
    {
      title: dict.contact.reportResourceTitle,
      description: dict.contact.reportResourceDesc,
      link: { href: "/legal/copyright", label: dict.contact.copyrightDetailsLinkText },
    },
    {
      title: dict.contact.pressPartnershipTitle,
      description: dict.contact.pressPartnershipDesc,
    },
  ];
}

export default async function ContactPage() {
  const dict = await getDictionary(await getLocale());
  const CATEGORIES = buildCategories(dict);

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <h1 className="mb-4 font-serif text-h1 font-semibold text-globanic-navy">{dict.contact.pageTitle}</h1>
        <p className="mb-8 text-body leading-relaxed text-slate-700">
          {dict.contact.intro}
        </p>

        <ul className="space-y-6 border-t border-slate-100">
          {CATEGORIES.map((c) => (
            <li key={c.title} className="border-b border-slate-100 pb-6 pt-6">
              <h2 className="mb-1 text-h4 font-semibold text-globanic-navy">{c.title}</h2>
              <p className="mb-2 text-body-sm leading-relaxed text-slate-600">{c.description}</p>
              {c.link && (
                <Link
                  href={c.link.href}
                  className="text-body-sm font-medium text-globanic-blue hover:underline"
                >
                  {c.link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded border border-dashed border-slate-200 bg-slate-50 p-5 text-body-sm text-slate-500">
          {dict.contact.emailPendingNotice}
        </div>
      </div>
    </div>
  );
}
