"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function DeleteEntityButton({
  onDelete,
  confirmMessage,
  redirectTo,
}: {
  onDelete: () => Promise<{ success: boolean; message?: string }>;
  confirmMessage: string;
  /** If provided, navigate here after a successful delete (detail page use).
   *  If omitted, the current list simply refreshes (list-row use). */
  redirectTo?: string;
}) {
  const t = useTranslations("adminDashboard");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await onDelete();
      if (!result.success) {
        setError(result.message ?? t("deleteErrorFallback"));
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <button
        disabled={pending}
        onClick={handleClick}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? t("deletingPending") : t("deleteCta")}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
