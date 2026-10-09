"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { DomainFormState } from "@/server/actions/admin-domain.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

type Defaults = {
  name?: string;
  icon?: string | null;
  order?: number;
};

function SubmitButton({ label }: { label: string }) {
  const t = useTranslations("adminDashboard");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-globanic-blue px-6 py-2.5 font-semibold text-white transition hover:bg-globanic-blueLight disabled:opacity-60"
    >
      {pending ? t("savingPending") : label}
    </button>
  );
}

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

export function DomainForm({
  action,
  defaults,
  submitLabel,
  redirectOnSuccess,
}: {
  action: (prevState: DomainFormState, formData: FormData) => Promise<DomainFormState>;
  defaults?: Defaults;
  submitLabel: string;
  /** Where to navigate after a successful create (edit stays on the page). */
  redirectOnSuccess?: string;
}) {
  const t = useTranslations("adminDashboard");
  const [state, formAction] = useFormState(action, { success: false } as DomainFormState);
  const router = useRouter();

  useEffect(() => {
    if (state.success && redirectOnSuccess) {
      router.push(redirectOnSuccess);
    }
  }, [state.success, redirectOnSuccess, router]);

  return (
    <form action={formAction} className="space-y-5">
      {state.message && !state.success && (
        <div className="rounded bg-red-50 p-3 text-body-sm text-red-700">{state.message}</div>
      )}
      {state.message && state.success && !redirectOnSuccess && (
        <div className="rounded bg-green-50 p-3 text-body-sm text-green-700">{state.message}</div>
      )}

      <div>
        <label htmlFor="domain-form-name" className="mb-1 block text-body-sm font-medium">{t("domainNameLabel")}</label>
        <input id="domain-form-name"
          name="name"
          defaultValue={defaults?.name}
          required
          className="w-full rounded border border-slate-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="domain-form-icon" className="mb-1 block text-body-sm font-medium">{t("domainIconLabel")}</label>
          <input id="domain-form-icon"
            name="icon"
            defaultValue={defaults?.icon ?? undefined}
            placeholder={t("domainIconPlaceholder")}
            className="w-full rounded border border-slate-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.icon} />
        </div>
        <div>
          <label htmlFor="domain-form-order" className="mb-1 block text-body-sm font-medium">{t("domainOrderLabel")}</label>
          <input id="domain-form-order"
            name="order"
            type="number"
            min={0}
            defaultValue={defaults?.order}
            placeholder={t("domainOrderPlaceholder")}
            className="w-full rounded border border-slate-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.order} />
        </div>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
