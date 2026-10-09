"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Role } from "@/server/auth/rbac";
import { GlobalSearchBox } from "./GlobalSearchBox";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useTranslations } from "@/components/i18n/I18nProvider";

type SessionUser = { id: string; email: string; role: Role; fullName?: string | null } | null;

export function MobileNav({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const NAV_LINKS = [
    { href: "/", label: t("home") },
    { href: "/resources", label: t("resources") },
    { href: "/resources/articles", label: t("articles") },
    { href: "/universities", label: t("universities") },
    { href: "/authors", label: t("authors") },
    { href: "/domains", label: t("domains") },
  ];

  const isPublisher = user && (user.role === "PUBLISHER" || user.role === "ADMIN" || user.role === "SUPER_ADMIN");
  const isAdmin = user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN");

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label={t("openMenu")}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="rounded p-2 text-globanic-navy hover:bg-slate-100"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          role="dialog"
          aria-modal="true"
          aria-label={t("mainMenu")}
          className="fixed inset-0 z-40 flex flex-col bg-white"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-serif text-h4 font-semibold text-globanic-navy">Globanic</span>
            <button onClick={() => setOpen(false)} aria-label={tCommon("closeMenu")} className="rounded p-2 text-globanic-navy hover:bg-slate-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-4">
              <GlobalSearchBox />
            </div>

            <nav aria-label={t("mainNavigation")}>
              <ul className="space-y-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block rounded px-3 py-2.5 text-body font-medium text-globanic-navy hover:bg-slate-50"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <LanguageSwitcher />
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              {user ? (
                <div className="space-y-1">
                  <Link href="/account" onClick={() => setOpen(false)} className="block rounded px-3 py-2.5 text-body font-medium text-globanic-navy hover:bg-slate-50">
                    {t("account")}
                  </Link>
                  {isPublisher && (
                    <Link href="/publisher/dashboard" onClick={() => setOpen(false)} className="block rounded px-3 py-2.5 text-body font-medium text-globanic-navy hover:bg-slate-50">
                      {t("publisherDashboard")}
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setOpen(false)} className="block rounded px-3 py-2.5 text-body font-medium text-globanic-navy hover:bg-slate-50">
                      {t("adminDashboard")}
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full rounded px-3 py-2.5 text-start text-body font-medium text-red-600 hover:bg-red-50"
                  >
                    {t("logout")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded border border-slate-300 px-4 py-2.5 text-center text-body font-semibold text-globanic-navy hover:bg-slate-50"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="rounded bg-globanic-navy px-4 py-2.5 text-center text-body font-semibold text-white hover:bg-globanic-navyDeep"
                  >
                    {t("createAccount")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
