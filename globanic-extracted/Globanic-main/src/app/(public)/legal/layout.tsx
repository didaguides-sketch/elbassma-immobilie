import type { ReactNode } from "react";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const dict = await getDictionary(await getLocale());

  const LEGAL_LINKS = [
    { href: "/legal/terms", label: dict.legal.navTermsLabel },
    { href: "/legal/privacy", label: dict.legal.navPrivacyLabel },
    { href: "/legal/copyright", label: dict.legal.navCopyrightLabel },
  ];

  return (
    <div className="container-page py-10">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[200px_1fr]">
        <nav aria-label={dict.legal.navAriaLabel} className="md:sticky md:top-24 md:self-start">
          <h2 className="mb-3 text-caption font-semibold uppercase tracking-wide text-slate-400">
            {dict.legal.navHeading}
          </h2>
          <ul className="space-y-1">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded px-2 py-1.5 text-body-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-globanic-navy"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
