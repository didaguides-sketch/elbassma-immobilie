"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createRevenuePeriodAction,
  finalizeRevenuePeriodAction,
  type AdminPayoutFormState,
} from "@/server/actions/admin-payout.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

const STATUS_LABEL_KEY: Record<string, string> = { DRAFT: "periodStatusDraft", FINALIZED: "periodStatusFinalizedText" };
const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  FINALIZED: "bg-green-50 text-green-700",
};

function SubmitButton() {
  const t = useTranslations("adminDashboard");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-globanic-navy px-6 py-2.5 font-semibold text-white hover:bg-globanic-navyDeep disabled:opacity-60"
    >
      {pending ? t("creatingPending") : t("createRevenuePeriodCta")}
    </button>
  );
}

export function CreateRevenuePeriodForm() {
  const t = useTranslations("adminDashboard");
  const [state, formAction] = useFormState(createRevenuePeriodAction, {
    success: false,
  } as AdminPayoutFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <div className={`rounded p-3 text-body-sm ${state.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </div>
      )}
      <div>
        <label htmlFor="revenue-period-form-label" className="mb-1 block text-body-sm font-medium">{t("labelFieldLabel")}</label>
        <input id="revenue-period-form-label" name="label" required placeholder={t("labelPlaceholderExample")} className="w-full rounded border border-slate-300 px-4 py-2.5 outline-none focus:border-globanic-blue" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="revenue-period-form-start" className="mb-1 block text-body-sm font-medium">{t("periodStartLabel")}</label>
          <input id="revenue-period-form-start" name="periodStart" type="date" required className="w-full rounded border border-slate-300 px-4 py-2.5 outline-none focus:border-globanic-blue" />
        </div>
        <div>
          <label htmlFor="revenue-period-form-end" className="mb-1 block text-body-sm font-medium">{t("periodEndLabel")}</label>
          <input id="revenue-period-form-end" name="periodEnd" type="date" required className="w-full rounded border border-slate-300 px-4 py-2.5 outline-none focus:border-globanic-blue" />
        </div>
      </div>
      <div>
        <label htmlFor="revenue-period-form-total-revenue" className="mb-1 block text-body-sm font-medium">{t("totalRevenueLabel")}</label>
        <input id="revenue-period-form-total-revenue" name="totalRevenue" type="number" step="0.01" min="0" required className="w-full rounded border border-slate-300 px-4 py-2.5 outline-none focus:border-globanic-blue" />
        <p className="mt-1 text-caption text-slate-500">{t("totalRevenueHint")}</p>
      </div>
      <SubmitButton />
    </form>
  );
}

export function FinalizePeriodButton({
  revenuePeriodId,
  disabled,
  canFinalize,
}: {
  revenuePeriodId: string;
  disabled?: boolean;
  canFinalize: boolean;
}) {
  const t = useTranslations("adminDashboard");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(t("finalizeConfirmMessage"))) {
      return;
    }
    startTransition(async () => {
      const result = await finalizeRevenuePeriodAction(revenuePeriodId);
      setMessage(result.message ?? null);
    });
  }

  // Server-side (`revenue-period:finalize`, SUPER_ADMIN-only) remains the
  // authoritative check — this is purely presentational, so a plain
  // ADMIN sees why the action isn't available instead of clicking a
  // live-looking button that would fail on the server.
  if (!canFinalize) {
    return (
      <p className="text-caption text-slate-500">
        {t("requiresSuperAdminMessage")}
      </p>
    );
  }

  return (
    <div className="text-start">
      <button
        onClick={handleClick}
        disabled={disabled || pending}
        className="rounded bg-globanic-navy px-4 py-2 text-body-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
      >
        {pending ? t("finalizingPending") : t("finalizePeriodCta")}
      </button>
      {message && <p className="mt-1 text-caption text-slate-500">{message}</p>}
    </div>
  );
}

export { STATUS_LABEL_KEY as PERIOD_STATUS_LABEL_KEY, STATUS_STYLE as PERIOD_STATUS_STYLE };
