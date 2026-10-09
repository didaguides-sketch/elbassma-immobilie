"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBookmarkAction } from "@/server/actions/analytics.actions";

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

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleBookmarkAction(resourceId, returnTo);
      if (!result.success) {
        setError(result.message ?? "تعذر تحديث الحفظ.");
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
        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          bookmarked
            ? "border-globanic-blue bg-blue-50 text-globanic-blue"
            : "border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {pending ? "..." : bookmarked ? "محفوظ ✓" : "حفظ (Bookmark)"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
