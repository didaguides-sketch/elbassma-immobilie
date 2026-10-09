"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitResourceAction } from "@/server/actions/resource.actions";

export function SubmitForReviewButton({ resourceId }: { resourceId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await submitResourceAction(resourceId);
      if (!result.success) {
        setError(result.message ?? "تعذر إرسال المورد للمراجعة.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded-lg bg-globanic-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-globanic-blueLight disabled:opacity-60"
      >
        {pending ? "جارٍ الإرسال..." : "إرسال للمراجعة"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
