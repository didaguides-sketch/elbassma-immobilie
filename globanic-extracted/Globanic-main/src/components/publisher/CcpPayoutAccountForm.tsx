"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitCcpPayoutAccountAction, type PayoutAccountFormState } from "@/server/actions/publisher-payout-account.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <>
      {errors.map((err) => (
        <p key={err} className="mt-1 text-body-sm text-red-600">
          {err}
        </p>
      ))}
    </>
  );
}

function SubmitButton() {
  const t = useTranslations("publisherDashboard");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-globanic-navy px-6 py-2.5 font-semibold text-white transition hover:bg-globanic-navyDeep disabled:opacity-60"
    >
      {pending ? t("submittingPending") : t("submitForReviewCta")}
    </button>
  );
}

export function CcpPayoutAccountForm() {
  const t = useTranslations("publisherDashboard");
  const [state, formAction] = useFormState(submitCcpPayoutAccountAction, {
    success: false,
  } as PayoutAccountFormState);

  return (
    <form action={formAction} className="space-y-5">
      {state.message && (
        <div
          className={`rounded p-3 text-body-sm ${
            state.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      )}

      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-body-sm text-amber-900">
        {t("ccpEncryptionNotice")}
      </div>

      <div>
        <label htmlFor="ccp-account-form-legal-full-name" className="mb-1 block text-body-sm font-medium">{t("ccpLegalFullNameLabel")}</label>
        <input id="ccp-account-form-legal-full-name"
          name="legalFullName"
          required
          className="w-full rounded border border-slate-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.legalFullName} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="ccp-account-form-account-number" className="mb-1 block text-body-sm font-medium">{t("ccpAccountNumberLabel")}</label>
          <input id="ccp-account-form-account-number"
            name="ccpAccountNumber"
            inputMode="numeric"
            required
            placeholder="0000000000"
            className="w-full rounded border border-slate-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.ccpAccountNumber} />
        </div>
        <div>
          <label htmlFor="ccp-account-form-key" className="mb-1 block text-body-sm font-medium">{t("ccpKeyLabel")}</label>
          <input id="ccp-account-form-key"
            name="ccpKey"
            inputMode="numeric"
            maxLength={2}
            required
            placeholder="00"
            className="w-full rounded border border-slate-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.ccpKey} />
        </div>
      </div>

      <div>
        <label htmlFor="ccp-account-form-rip" className="mb-1 block text-body-sm font-medium">{t("ripLabel")}</label>
        <input id="ccp-account-form-rip"
          name="rip"
          inputMode="numeric"
          placeholder="00799999XXXXXXXXXXXX"
          className="w-full rounded border border-slate-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.rip} />
      </div>

      <SubmitButton />
    </form>
  );
}
