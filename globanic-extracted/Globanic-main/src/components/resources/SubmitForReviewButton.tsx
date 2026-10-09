"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitResourceAction } from "@/server/actions/resource.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function SubmitForReviewButton({ resourceId }: { resourceId: string }) {
  const t = useTranslations("publisherDashboard");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await submitResourceAction(resourceId);
      if (!result.success) {
        setError(result.message ?? t("submitForReviewErrorFallback"));
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
        className="rounded bg-globanic-navy px-4 py-2 text-body-sm font-semibold text-white transition hover:bg-globanic-navyDeep disabled:opacity-60"
      >
        {pending ? t("submittingPending") : t("submitForReviewCta")}
      </button>
      {error && <p className="mt-1 text-body-sm text-red-600">{error}</p>}
    </div>
  );
}
