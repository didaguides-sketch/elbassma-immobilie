"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPreferredPayoutAccountAction } from "@/server/actions/publisher-payout-account.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function SetPreferredPayoutAccountButton({ payoutAccountId }: { payoutAccountId: string }) {
  const t = useTranslations("publisherDashboard");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await setPreferredPayoutAccountAction(payoutAccountId);
      if (!result.success) {
        setError(result.message ?? t("setPreferredErrorFallback"));
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
        className="rounded border border-slate-300 px-3 py-1.5 text-caption font-semibold text-globanic-navy transition hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? t("settingPreferredPending") : t("setPreferredCta")}
      </button>
      {error && <p className="mt-1 text-caption text-red-600">{error}</p>}
    </div>
  );
}
