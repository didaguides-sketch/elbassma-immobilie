"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Role } from "@/server/auth/rbac";
import { useTranslations } from "@/components/i18n/I18nProvider";

type SessionUser = { id: string; email: string; role: Role; fullName?: string | null };

function initialsOf(nameOrEmail: string) {
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return "؟";
  return trimmed[0]?.toUpperCase() ?? "؟";
}

/**
 * Authenticated account menu. This is also, notably, the FIRST working
 * logout control anywhere in the product — grep across the whole
 * codebase found zero prior uses of signOut, meaning there was
 * previously no way for a signed-in user to log out from the UI at all.
 */
export function AccountMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("nav");
  const tAccount = useTranslations("account");

  const ROLE_LABEL: Record<Role, string> = {
    USER: tAccount("roleStudent"),
    PUBLISHER: tAccount("rolePublisher"),
    ADMIN: tAccount("roleAdmin"),
    SUPER_ADMIN: tAccount("roleSuperAdmin"),
  };

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const displayName = user.fullName || user.email;
  const isPublisher = user.role === "PUBLISHER" || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={displayName}
        className="flex items-center gap-2 rounded p-1 hover:bg-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-globanic-navy text-body-sm font-semibold text-white">
          {initialsOf(displayName)}
        </span>
        <span className="hidden text-body-sm font-medium text-globanic-navy sm:inline">{displayName}</span>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-raised"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-body-sm font-semibold text-globanic-navy">{displayName}</p>
            <p className="text-caption text-slate-500">{ROLE_LABEL[user.role]}</p>
          </div>

          <nav className="py-1">
            <Link role="menuitem" href="/account" className="block px-4 py-2 text-body-sm text-globanic-navy hover:bg-slate-50">
              {t("account")}
            </Link>
            {isPublisher && (
              <Link
                role="menuitem"
                href="/publisher/dashboard"
                className="block px-4 py-2 text-body-sm text-globanic-navy hover:bg-slate-50"
              >
                {t("publisherDashboard")}
              </Link>
            )}
            {isAdmin && (
              <Link role="menuitem" href="/admin" className="block px-4 py-2 text-body-sm text-globanic-navy hover:bg-slate-50">
                {t("adminDashboard")}
              </Link>
            )}
          </nav>

          <div className="border-t border-slate-100 py-1">
            <button
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="block w-full px-4 py-2 text-start text-body-sm text-red-600 hover:bg-red-50"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
