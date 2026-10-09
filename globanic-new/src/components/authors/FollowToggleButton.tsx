"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFollowAction } from "@/server/actions/follow.actions";

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

  function handleClick() {
    setError(null);
    // The button always sends the explicit *opposite* of what it
    // currently displays — an intent, not a "flip whatever the server
    // has" instruction — matching setAuthorFollowState's idempotent design.
    const nextIntent = !following;

    startTransition(async () => {
      const result = await setFollowAction(authorId, nextIntent, returnTo);
      if (!result.success) {
        setError(result.message ?? "تعذر تحديث المتابعة.");
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
        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          following
            ? "border-globanic-blue bg-blue-50 text-globanic-blue"
            : "border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {pending ? "..." : following ? "متابَع ✓" : "متابعة"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
