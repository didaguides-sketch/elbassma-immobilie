"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useTranslations } from "@/components/i18n/I18nProvider";

function NavGroups({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("admin");

  const NAV_GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
    {
      title: t("overview"),
      items: [{ href: "/admin", label: t("dashboard") }],
    },
    {
      title: t("content"),
      items: [
        { href: "/admin/resources", label: t("resources") },
        { href: "/admin/reports", label: t("reports") },
        { href: "/admin/universities", label: t("universities") },
        { href: "/admin/domains", label: t("domains") },
      ],
    },
    {
      title: t("people"),
      items: [
        { href: "/admin/users", label: t("users") },
        { href: "/admin/publisher-applications", label: t("publisherApplications") },
      ],
    },
    {
      title: t("finance"),
      items: [
        { href: "/admin/revenue-periods", label: t("revenuePeriods") },
        { href: "/admin/payouts", label: t("payouts") },
        { href: "/admin/payout-accounts", label: t("payoutAccounts") },
      ],
    },
    {
      title: t("operations"),
      items: [{ href: "/admin/moderation-logs", label: t("moderationLogs") }],
    },
  ];

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-1 px-3 text-caption font-semibold uppercase tracking-wide text-blue-300/70">
            {group.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="rounded px-3 py-2.5 text-body-sm text-blue-100 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/**
 * Phase 15: on mobile the previous version of this component rendered
 * its full desktop content (5 nav groups, ~15 links, plus the account
 * footer) stacked ABOVE the page — because the parent layout is a plain
 * `flex-col` below `sm:`. An admin on a phone had to scroll past the
 * entire nav before reaching any actual page content on every single
 * navigation. This splits into two renders of the same NAV_GROUPS data
 * (no duplicated navigation *data*, just two presentations of it,
 * mirroring the exact pattern the public site's SiteHeader/MobileNav
 * pair already uses): a slim top bar with a hamburger below `sm:`, and
 * the unchanged full sidebar at `sm:` and above.
 *
 * Phase 16B, Batch 1: NAV_GROUPS moved inside NavGroups() (it now
 * depends on the `admin` translation namespace via a hook, so it can no
 * longer be a module-level constant) — both the mobile drawer's
 * <NavGroups> and the desktop <aside>'s <NavGroups> render from this
 * ONE function/ONE set of translation keys, so there is exactly one
 * translated copy of each label, not two independently-maintained ones.
 */
export function AdminSidebar({
  userEmail,
  userRole,
}: {
  userEmail: string;
  userRole: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");

  return (
    <>
      {/* Mobile top bar — replaces the old stacked-full-sidebar behavior below sm: */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-globanic-navy px-4 py-3 text-white sm:hidden">
        <Link href="/admin" className="font-serif text-h4 font-semibold">
          Globanic <span className="text-caption font-normal text-blue-200">· {t("panelLabel")}</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label={t("openMenu")}
          aria-expanded={open}
          aria-controls="admin-mobile-nav-panel"
          className="rounded p-2 hover:bg-white/10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          id="admin-mobile-nav-panel"
          role="dialog"
          aria-modal="true"
          aria-label={t("panelLabel")}
          className="fixed inset-0 z-40 flex flex-col bg-globanic-navy text-white sm:hidden"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="font-serif text-h4 font-semibold">{t("panelLabel")}</span>
            <button
              onClick={() => setOpen(false)}
              aria-label={tCommon("closeMenu")}
              className="rounded p-2 hover:bg-white/10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <NavGroups onNavigate={() => setOpen(false)} />

          <div className="border-t border-white/10 p-4 text-caption text-blue-200">
            <p className="truncate">{userEmail}</p>
            <p className="mt-0.5 font-semibold text-white">{userRole}</p>
            <div className="mt-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar — unchanged from Phase 14 */}
      <aside className="hidden sm:flex sm:h-screen sm:w-64 sm:flex-col sm:border-e sm:border-white/10 sm:bg-globanic-navy sm:text-white">
        <div className="p-5">
          <p className="font-serif text-lg font-bold">Globanic</p>
          <p className="mt-1 text-caption text-blue-200">{t("panelLabel")}</p>
        </div>

        <NavGroups />

        <div className="border-t border-white/10 p-4 text-caption text-blue-200">
          <p className="truncate">{userEmail}</p>
          <p className="mt-0.5 font-semibold text-white">{userRole}</p>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
