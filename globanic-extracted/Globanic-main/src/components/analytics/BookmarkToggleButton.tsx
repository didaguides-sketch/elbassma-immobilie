"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBookmarkAction } from "@/server/actions/analytics.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function BookmarkToggleButton({
  resourceId,
  initiallyBookmarked,
  returnTo,
}: {
  resourceId: string;
  initiallyBookmarked: boolean;
  returnTo?: string;
}) {
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("resource");

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleBookmarkAction(resourceId, returnTo);
      if (!result.success) {
        setError(result.message ?? t("saveErrorFallback"));
        return;
      }
      setBookmarked(!!result.bookmarked);
      router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={pending}
        aria-pressed={bookmarked}
        className={`inline-flex items-center gap-1.5 rounded border px-4 py-2 text-body-sm font-semibold transition disabled:opacity-60 ${
          bookmarked
            ? "border-globanic-blue bg-blue-50 text-globanic-blue"
            : "border-slate-300 text-globanic-navy hover:bg-slate-50"
        }`}
      >
        {pending ? "..." : bookmarked ? t("savedButton") : t("saveButton")}
      </button>
      {error && <p className="mt-1 text-body-sm text-red-600">{error}</p>}
    </div>
  );
}
