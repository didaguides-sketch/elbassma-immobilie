"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFollowAction } from "@/server/actions/follow.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function FollowToggleButton({
  authorId,
  initiallyFollowing,
  returnTo,
}: {
  authorId: string;
  initiallyFollowing: boolean;
  returnTo?: string;
}) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("author");

  function handleClick() {
    setError(null);
    // The button always sends the explicit *opposite* of what it
    // currently displays — an intent, not a "flip whatever the server
    // has" instruction — matching setAuthorFollowState's idempotent design.
    const nextIntent = !following;

    startTransition(async () => {
      const result = await setFollowAction(authorId, nextIntent, returnTo);
      if (!result.success) {
        setError(result.message ?? t("followErrorFallback"));
        return;
      }
      setFollowing(!!result.following);
      router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={pending}
        aria-pressed={following}
        className={`rounded border px-4 py-2 text-body-sm font-semibold transition disabled:opacity-60 ${
          following
            ? "border-globanic-blue bg-blue-50 text-globanic-blue"
            : "border-slate-300 text-globanic-navy hover:bg-slate-50"
        }`}
      >
        {pending ? "..." : following ? t("followingButton") : t("followButton")}
      </button>
      {error && <p className="mt-1 text-body-sm text-red-600">{error}</p>}
    </div>
  );
}
