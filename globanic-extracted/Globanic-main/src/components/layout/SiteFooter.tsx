import Link from "next/link";
import type { ReactNode } from "react";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

/**
 * Real routes only get real links. As of Phase 10, About/Contact/Help
 * and the Terms/Privacy/Copyright legal pages exist and are wired below
 * as real links, replacing the "قريبًا" (soon) placeholders that stood
 * in for them since Phase 2. A full Publishers directory still does
 * not exist as a route (only individual /publishers/[id] profiles do)
 * — that one keeps its placeholder treatment rather than linking to a
 * page that isn't real.
 *
 * Phase 16B, Batch 1: labels now come from dictionaries. Where a
 * footer link's text is byte-identical to an existing `nav` key (e.g.
 * "Resources", "Articles", "Universities", "Authors", "Log in"), that
 * SAME key is reused here rather than duplicated under `footer` — see
 * the batch report for why (avoiding the "same concept, two keys"
 * drift the brief explicitly warns against). Where the footer's source
 * text was already genuinely different from its nav counterpart (e.g.
 * "Academic domains" here vs. plain "Domains" in nav), it keeps its
 * own distinct `footer` key rather than being artificially merged.
 */
function ComingSoonItem({ label, badge }: { label: string; badge: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-body-sm text-slate-400">
      {label}
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-caption">{badge}</span>
    </span>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-caption font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

export async function SiteFooter() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.footer;
  const tNav = dict.nav;

  const EXPLORE_LINKS = [
    { href: "/resources", label: tNav.resources },
    { href: "/resources/articles", label: tNav.articles },
    { href: "/universities", label: tNav.universities },
    { href: "/domains", label: t.domainsAcademic },
    { href: "/authors", label: tNav.authors },
  ];

  const GLOBANIC_LINKS = [
    { href: "/about", label: t.aboutGlobanic },
    { href: "/contact", label: t.contact },
    { href: "/help", label: t.help },
    { href: "/trust", label: t.trust },
  ];

  const LEGAL_LINKS = [
    { href: "/legal/terms", label: t.terms },
    { href: "/legal/privacy", label: t.privacy },
    { href: "/legal/copyright", label: t.copyright },
  ];

  return (
    <footer className="border-t border-slate-200 bg-globanic-navyDeep text-white">
      <div className="container-page py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <FooterColumn title={t.exploreHeading}>
            {EXPLORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-body-sm text-white/80 hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <ComingSoonItem label={t.comingSoonPublishers} badge={t.comingSoonBadge} />
            </li>
          </FooterColumn>

          <FooterColumn title={t.globanicHeading}>
            {GLOBANIC_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-body-sm text-white/80 hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title={t.legalHeading}>
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-body-sm text-white/80 hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title={t.publishHeading}>
            <li>
              <Link href="/publisher/apply" className="text-body-sm text-white/80 hover:text-white">
                {t.becomePublisher}
              </Link>
            </li>
            <li>
              <Link href="/publisher-guidelines" className="text-body-sm text-white/80 hover:text-white">
                {t.publisherGuidelines}
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-body-sm text-white/80 hover:text-white">
                {tNav.login}
              </Link>
            </li>
          </FooterColumn>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-caption text-white/50">{t.copyrightNotice.replace("{year}", String(new Date().getFullYear()))}</p>
        </div>
      </div>
    </footer>
  );
}
