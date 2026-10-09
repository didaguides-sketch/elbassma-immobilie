"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  submitPublisherApplicationAction,
  type ApplicationFormState,
} from "@/server/actions/publisher-application.actions";
import type { DomainWithSpecialties, UniversityWithFaculties } from "@/server/services/taxonomy.service";
import { useTranslations } from "@/components/i18n/I18nProvider";

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <>
      {errors.map((err) => (
        <p key={err} className="mt-1 text-sm text-red-600">
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
      className="w-full rounded-lg bg-globanic-blue py-3 font-semibold text-white transition hover:bg-globanic-blueLight disabled:opacity-60"
    >
      {pending ? t("submittingPending") : t("appSubmitCta")}
    </button>
  );
}

export function PublisherApplicationForm({
  domains,
  universities,
}: {
  domains: DomainWithSpecialties[];
  universities: UniversityWithFaculties[];
}) {
  const t = useTranslations("publisherDashboard");
  const [state, formAction] = useFormState(submitPublisherApplicationAction, {
    success: false,
  } as ApplicationFormState);

  if (state.success) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-green-800">{state.message}</div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.message && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.message}</div>
      )}

      <div>
        <label htmlFor="publisher-application-form-full-name" className="mb-1 block text-sm font-medium">{t("appFullNameLabel")}</label>
        <input id="publisher-application-form-full-name"
          name="fullName"
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.fullName} />
      </div>

      <div>
        <label htmlFor="publisher-application-form-university" className="mb-1 block text-sm font-medium">{t("appUniversityLabel")}</label>
        <select id="publisher-application-form-university"
          name="universityId"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        >
          <option value="">{t("formSelectUniversityPlaceholder")}</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <FieldErrors errors={state.errors?.universityId} />
      </div>

      <div>
        <label htmlFor="publisher-application-form-academic-status" className="mb-1 block text-sm font-medium">{t("appAcademicStatusLabel")}</label>
        <input id="publisher-application-form-academic-status"
          name="academicStatus"
          required
          placeholder={t("appAcademicStatusPlaceholder")}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.academicStatus} />
      </div>

      <div>
        <label htmlFor="publisher-application-form-specialty" className="mb-1 block text-sm font-medium">{t("formSpecialtyLabel")}</label>
        <select id="publisher-application-form-specialty"
          name="specialtyId"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        >
          <option value="">{t("formSelectSpecialtyPlaceholder")}</option>
          {domains.map((d) =>
            d.specialties.length > 0 ? (
              <optgroup key={d.id} label={d.name}>
                {d.specialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </select>
        <FieldErrors errors={state.errors?.specialtyId} />
      </div>

      <div>
        <label htmlFor="publisher-application-form-academic-email" className="mb-1 block text-sm font-medium">{t("appAcademicEmailLabel")}</label>
        <input id="publisher-application-form-academic-email"
          type="email"
          name="academicEmail"
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.academicEmail} />
      </div>

      <div>
        <label htmlFor="publisher-application-form-additional-info" className="mb-1 block text-sm font-medium">{t("appAdditionalInfoLabel")}</label>
        <textarea id="publisher-application-form-additional-info"
          name="additionalInfo"
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.additionalInfo} />
      </div>

      <div>
        <label htmlFor="publisher-application-form-proof-file" className="mb-1 block text-sm font-medium">{t("appProofFileLabel")}</label>
        <input id="publisher-application-form-proof-file"
          type="file"
          name="proofFile"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
          className="block w-full text-sm text-gray-700 file:me-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <p className="mt-1 text-xs text-gray-500">
          {t("appProofFileHint")}
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}
