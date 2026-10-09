import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { GlobalSearchBox } from "./GlobalSearchBox";
import { AccountMenu } from "./AccountMenu";
import { MobileNav } from "./MobileNav";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

/**
 * The global header for the public surface (home, resources,
 * universities, authors, domains, search — see (public)/layout.tsx).
 * Admin and Publisher keep their own distinct chrome (AdminSidebar,
 * publisher layout) per the design brief's explicit instruction that
 * the admin interface should not look like the consumer product — this
 * header is intentionally NOT rendered there.
 *
 * "Articles" links to /resources/articles — a real, working route
 * (resources/[type]/page.tsx maps the French URL segment to
 * ResourceType.ARTICLE, same pattern already used for detail pages).
 * "Publishers" is NOT in the nav: there is no /publishers directory
 * route (only individual publisher profile pages), so that one is a
 * genuine future item, not an oversight.
 *
 * Phase 16B, Batch 1: nav labels now come from the `nav` dictionary
 * namespace instead of being hardcoded — this is a Server Component,
 * so it calls getLocale()/getDictionary() directly rather than using
 * the client useTranslations() hook. NAV_LINKS' `href`s (real routes)
 * are unaffected — only the `label` shown for each is now translated.
 */
export async function SiteHeader() {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  const dict = await getDictionary(locale);
  const t = dict.nav;

  const NAV_LINKS = [
    { href: "/resources", label: t.resources },
    { href: "/resources/articles", label: t.articles },
    { href: "/universities", label: t.universities },
    { href: "/authors", label: t.authors },
    { href: "/domains", label: t.domains },
  ];

  const user = session?.user
    ? { id: session.user.id, email: session.user.email ?? "", role: session.user.role, fullName: session.user.name }
    : null;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="container-page flex h-16 items-center gap-4">
        <MobileNav user={user} />

        <Link href="/" className="shrink-0 font-serif text-h4 font-semibold text-globanic-navy">
          Globanic
        </Link>

        <nav aria-label={t.mainNavigation} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded px-3 py-2 text-body-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-globanic-navy"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden max-w-sm flex-1 md:block">
          <GlobalSearchBox compact />
        </div>

        <div className="ms-auto flex items-center gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="rounded px-3 py-2 text-body-sm font-semibold text-globanic-navy hover:bg-slate-50">
                {t.login}
              </Link>
              <Link
                href="/register"
                className="rounded bg-globanic-navy px-4 py-2 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep"
              >
                {t.createAccount}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
