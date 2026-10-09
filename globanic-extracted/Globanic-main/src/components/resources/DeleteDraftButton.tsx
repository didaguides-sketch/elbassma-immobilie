"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteResourceAction } from "@/server/actions/resource.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function DeleteDraftButton({
  resourceId,
  redirectTo,
}: {
  resourceId: string;
  redirectTo?: string;
}) {
  const t = useTranslations("publisherDashboard");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    if (!window.confirm(t("deleteDraftConfirm"))) {
      return;
    }
    startTransition(async () => {
      const result = await deleteResourceAction(resourceId);
      if (!result.success) {
        setError(result.message ?? t("deleteDraftErrorFallback"));
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded border border-red-300 px-4 py-2 text-body-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? t("deletingPending") : t("deleteDraftCta")}
      </button>
      {error && <p className="mt-1 text-body-sm text-red-600">{error}</p>}
    </div>
  );
}
