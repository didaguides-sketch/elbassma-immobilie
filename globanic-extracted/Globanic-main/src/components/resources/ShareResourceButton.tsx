"use client";

import { useState } from "react";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function ShareResourceButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("resource");

  async function handleShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled the native share sheet, or it failed — fall
        // through to copy-link rather than showing an error for a
        // cancellation, which isn't a real failure.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked by permissions/context — silently
      // no-op rather than showing a broken error state for a
      // non-critical secondary action.
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded border border-slate-300 px-4 py-2 text-body-sm font-medium text-globanic-navy hover:bg-slate-50"
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {copied ? t("shareCopiedConfirmation") : t("shareButton")}
    </button>
  );
}
