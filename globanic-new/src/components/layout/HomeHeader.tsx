"use client";

import { useState } from "react";
import type { ReactNode } from "react";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/resources", label: "الموارد" },
  { href: "/universities", label: "الجامعات" },
  { href: "/authors", label: "الباحثون" },
  { href: "/domains", label: "المجالات" },
  { href: "/search", label: "بحث" },
];

export function HomeHeader({ accountArea }: { accountArea: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="القائمة"
          aria-expanded={open}
          className="rounded-lg p-2 text-globanic-navy hover:bg-gray-50"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <a href="/" className="text-lg font-bold text-globanic-navy">
          Globanic
        </a>

        {/* Decorative only — no language switcher yet. Multilingual
            support (FR/EN/AR-RTL/ES, hreflang, a functional selector) is
            an explicitly separate future phase, per the approved plan. */}
        <span aria-hidden="true" className="p-2 text-globanic-navy/60">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9z" />
          </svg>
        </span>
      </div>

      {open && (
        <nav className="border-t border-gray-100 bg-white px-4 py-3">
          <ul className="space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-globanic-navy hover:bg-gray-50"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-gray-100 pt-3">{accountArea}</div>
        </nav>
      )}
    </header>
  );
}
