"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import {
  verifyPayoutAccountAction,
  revealPayoutAccountDetailsAction,
  rejectPayoutAccountAction,
  setPublisherSharePercentageAction,
  type AdminPayoutFormState,
} from "@/server/actions/admin-payout.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

type Props = {
  account: {
    id: string;
    legalFullName: string;
    maskedPreview: string;
    method: string;
    createdAt: Date;
    publisher: {
      id: string;
      email: string;
      profile: { fullName: string; payoutSharePercentage: string | null } | null;
    };
  };
};

type RevealedDetails = { ccpAccountNumber?: string; ccpKey?: string; rip?: string };

export function PayoutAccountReviewCard({ account }: Props) {
  const t = useTranslations("adminDashboard");
  const [pending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<RevealedDetails | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectState, rejectAction] = useFormState(rejectPayoutAccountAction, {
    success: false,
  } as AdminPayoutFormState);
  const [shareState, shareAction] = useFormState(setPublisherSharePercentageAction, {
    success: false,
  } as AdminPayoutFormState);

  function handleReveal() {
    startTransition(async () => {
      const result = await revealPayoutAccountDetailsAction(account.id);
      if (result.success) {
        setRevealed(result.details as RevealedDetails);
      } else {
        setMessage(result.message);
      }
    });
  }

  function handleVerify() {
    startTransition(async () => {
      const result = await verifyPayoutAccountAction(account.id);
      setMessage(result.message ?? null);
    });
  }

  return (
    <div className="rounded border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-globanic-navy">
            {account.publisher.profile?.fullName ?? account.publisher.email}
          </p>
          <p className="text-caption text-slate-500">{account.publisher.email}</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-caption font-semibold text-amber-800">
          {t("filterUnderReview")}
        </span>
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-3 text-body-sm">
        <div>
          <dt className="text-slate-500">{t("legalFullNameQualifiedLabel")}</dt>
          <dd className="font-medium">{account.legalFullName}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t("previewLabel")}</dt>
          <dd className="font-medium">{account.maskedPreview}</dd>
        </div>
      </dl>

      {revealed ? (
        <dl className="mb-4 grid grid-cols-1 gap-3 rounded bg-slate-50 p-3 text-body-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">{t("ccpAccountNumberRevealLabel")}</dt>
            <dd className="font-mono font-medium">{revealed.ccpAccountNumber}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("keyRevealLabel")}</dt>
            <dd className="font-mono font-medium">{revealed.ccpKey}</dd>
          </div>
          <div>
            <dt className="text-slate-500">RIP</dt>
            <dd className="font-mono font-medium">{revealed.rip ?? t("emptyValuePlaceholder")}</dd>
          </div>
        </dl>
      ) : (
        <button
          onClick={handleReveal}
          disabled={pending}
          className="mb-4 rounded border border-slate-300 px-4 py-2 text-body-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {t("revealDetailsCta")}
        </button>
      )}

      {message && <p className="mb-3 text-body-sm text-green-700">{message}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleVerify}
          disabled={pending}
          className="rounded bg-green-600 px-4 py-2 text-body-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {t("verifyAccountCta")}
        </button>
        <button
          onClick={() => setShowReject((v) => !v)}
          className="rounded border border-red-300 px-4 py-2 text-body-sm font-semibold text-red-700 hover:bg-red-50"
        >
          {t("rejectCta")}
        </button>
      </div>

      {showReject && (
        <form action={rejectAction} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <input type="hidden" name="payoutAccountId" value={account.id} />
          <label htmlFor={`payout-account-reject-reason-${account.id}`} className="block text-body-sm font-medium">{t("rejectionReasonBareLabel")}</label>
          <textarea id={`payout-account-reject-reason-${account.id}`}
            name="rejectionReason"
            required
            rows={2}
            className="w-full rounded border border-slate-300 px-3 py-2 text-body-sm outline-none focus:border-globanic-blue"
          />
          {rejectState.errors?.rejectionReason && (
            <p className="text-body-sm text-red-600">{rejectState.errors.rejectionReason[0]}</p>
          )}
          <button
            type="submit"
            className="rounded bg-red-600 px-4 py-2 text-body-sm font-semibold text-white hover:bg-red-700"
          >
            {t("confirmRejectionCta")}
          </button>
        </form>
      )}

      <form action={shareAction} className="mt-4 flex items-end gap-3 border-t border-slate-100 pt-4">
        <input type="hidden" name="publisherUserId" value={account.publisher.id} />
        <div>
          <label htmlFor={`payout-account-share-${account.id}`} className="mb-1 block text-caption font-medium text-slate-500">
            {t("publisherShareLabel")}
          </label>
          <input id={`payout-account-share-${account.id}`}
            name="payoutSharePercentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={account.publisher.profile?.payoutSharePercentage ?? ""}
            placeholder={t("defaultPlaceholder")}
            className="w-32 rounded border border-slate-300 px-3 py-1.5 text-body-sm outline-none focus:border-globanic-blue"
          />
        </div>
        <button
          type="submit"
          className="rounded border border-slate-300 px-3 py-1.5 text-body-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t("saveShareCta")}
        </button>
        {shareState.message && <p className="text-caption text-slate-500">{shareState.message}</p>}
      </form>
    </div>
  );
}
