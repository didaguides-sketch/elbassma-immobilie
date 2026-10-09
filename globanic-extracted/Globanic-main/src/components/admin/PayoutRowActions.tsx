"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import {
  approvePayoutAction,
  markPayoutPaidAction,
  markPayoutFailedAction,
  type AdminPayoutFormState,
} from "@/server/actions/admin-payout.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function PayoutRowActions({ payoutId, status }: { payoutId: string; status: string }) {
  const t = useTranslations("adminDashboard");
  const [pending, startTransition] = useTransition();
  const [showPaidForm, setShowPaidForm] = useState(false);
  const [showFailForm, setShowFailForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [paidState, paidAction] = useFormState(markPayoutPaidAction, { success: false } as AdminPayoutFormState);
  const [failState, failAction] = useFormState(markPayoutFailedAction, { success: false } as AdminPayoutFormState);

  function handleApprove() {
    startTransition(async () => {
      const result = await approvePayoutAction(payoutId);
      setMessage(result.message ?? null);
    });
  }

  if (status === "PENDING") {
    return (
      <div>
        <button
          onClick={handleApprove}
          disabled={pending}
          className="rounded bg-globanic-navy px-3 py-1.5 text-caption font-semibold text-white hover:bg-globanic-navyDeep disabled:opacity-60"
        >
          {t("approvePayoutCta")}
        </button>
        {message && <p className="mt-1 text-caption text-red-600">{message}</p>}
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setShowPaidForm((v) => !v)}
            className="rounded bg-green-600 px-3 py-1.5 text-caption font-semibold text-white hover:bg-green-700"
          >
            {t("markPaidCta")}
          </button>
          <button
            onClick={() => setShowFailForm((v) => !v)}
            className="rounded border border-red-300 px-3 py-1.5 text-caption font-semibold text-red-700 hover:bg-red-50"
          >
            {t("markFailedCta")}
          </button>
        </div>

        {showPaidForm && (
          <form action={paidAction} className="space-y-2 rounded bg-slate-50 p-3">
            <input type="hidden" name="payoutId" value={payoutId} />
            <input
              name="transactionReference"
              required
              placeholder={t("transactionRefPlaceholder")}
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-caption outline-none focus:border-globanic-blue"
            />
            <input
              name="paidAt"
              type="date"
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-caption outline-none focus:border-globanic-blue"
            />
            <button type="submit" className="rounded bg-green-600 px-3 py-1.5 text-caption font-semibold text-white hover:bg-green-700">
              {t("confirmPaymentCta")}
            </button>
            {paidState.message && <p className="text-caption text-slate-600">{paidState.message}</p>}
          </form>
        )}

        {showFailForm && (
          <form action={failAction} className="space-y-2 rounded bg-slate-50 p-3">
            <input type="hidden" name="payoutId" value={payoutId} />
            <textarea
              name="failureReason"
              required
              rows={2}
              placeholder={t("failureReasonPlaceholder")}
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-caption outline-none focus:border-globanic-blue"
            />
            <button type="submit" className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
              {t("confirmFailureCta")}
            </button>
            {failState.message && <p className="text-caption text-slate-600">{failState.message}</p>}
          </form>
        )}
      </div>
    );
  }

  return null;
}
