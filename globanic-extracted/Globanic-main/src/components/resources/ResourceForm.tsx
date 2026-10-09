"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { ResourceFormState } from "@/server/actions/resource.actions";
import type { DomainWithSpecialties, UniversityWithFaculties } from "@/server/services/taxonomy.service";
import { useTranslations } from "@/components/i18n/I18nProvider";

// Phase 16B, Batch 6: these values are the ResourceType enum itself
// (unchanged) — only their displayed label now comes from the shared
// `resourceType` dictionary namespace (already established in Batch 2
// for ResourceCard.tsx etc.), instead of this form's own,
// independently-hardcoded French-only labels.
const RESOURCE_TYPE_VALUES = ["COURS", "MEMOIRE", "ARTICLE", "THESE", "LIVRE"] as const;

type Defaults = {
  title?: string;
  type?: string;
  abstract?: string;
  description?: string;
  keywords?: string[];
  domainId?: string;
  specialtyId?: string;
  universityId?: string;
  facultyId?: string;
  level?: string;
  year?: number | null;
  language?: string;
  authorName?: string;
};

function SubmitButton({ label }: { label: string }) {
  const t = useTranslations("publisherDashboard");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-globanic-blue px-6 py-2.5 font-semibold text-white transition hover:bg-globanic-blueLight disabled:opacity-60"
    >
      {pending ? t("formSavingPending") : label}
    </button>
  );
}

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

export function ResourceForm({
  action,
  domains,
  universities,
  defaults,
  submitLabel,
  lockType = false,
}: {
  action: (prevState: ResourceFormState, formData: FormData) => Promise<ResourceFormState>;
  domains: DomainWithSpecialties[];
  universities: UniversityWithFaculties[];
  defaults?: Defaults;
  submitLabel: string;
  lockType?: boolean;
}) {
  const t = useTranslations("publisherDashboard");
  const tType = useTranslations("resourceType");
  const [state, formAction] = useFormState(action, { success: false } as ResourceFormState);
  const router = useRouter();

  useEffect(() => {
    if (state.success && state.resourceId) {
      router.push(`/publisher/resources/${state.resourceId}`);
    }
  }, [state.success, state.resourceId, router]);

  const [domainId, setDomainId] = useState(defaults?.domainId ?? "");
  const [universityId, setUniversityId] = useState(defaults?.universityId ?? "");

  const specialties = useMemo(
    () => domains.find((d) => d.id === domainId)?.specialties ?? [],
    [domains, domainId],
  );
  const faculties = useMemo(
    () => universities.find((u) => u.id === universityId)?.faculties ?? [],
    [universities, universityId],
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.message && !state.success && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.message}</div>
      )}
      {state.message && state.success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{state.message}</div>
      )}

      <div>
        <label htmlFor="resource-form-title" className="mb-1 block text-sm font-medium">{t("formTitleLabel")}</label>
        <input id="resource-form-title"
          name="title"
          defaultValue={defaults?.title}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.title} />
      </div>

      <div>
        <label htmlFor="resource-form-type" className="mb-1 block text-sm font-medium">{t("formTypeLabel")}</label>
        <select id="resource-form-type"
          name="type"
          defaultValue={defaults?.type}
          required
          disabled={lockType}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue disabled:bg-gray-100"
        >
          <option value="">{t("formSelectTypePlaceholder")}</option>
          {RESOURCE_TYPE_VALUES.map((value) => (
            <option key={value} value={value}>
              {tType(value)}
            </option>
          ))}
        </select>
        {lockType && (
          <p className="mt-1 text-xs text-gray-500">{t("formTypeLockedHint")}</p>
        )}
        <FieldErrors errors={state.errors?.type} />
      </div>

      <div>
        <label htmlFor="resource-form-author-name" className="mb-1 block text-sm font-medium">{t("formAuthorNameLabel")}</label>
        <input id="resource-form-author-name"
          name="authorName"
          defaultValue={defaults?.authorName}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <p className="mt-1 text-xs text-gray-500">
          {t("formAuthorNameHint")}
        </p>
        <FieldErrors errors={state.errors?.authorName} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="resource-form-domain" className="mb-1 block text-sm font-medium">{t("formDomainLabel")}</label>
          <select id="resource-form-domain"
            name="domainId"
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          >
            <option value="">{t("formSelectDomainPlaceholder")}</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <FieldErrors errors={state.errors?.domainId} />
        </div>

        <div>
          <label htmlFor="resource-form-specialty" className="mb-1 block text-sm font-medium">{t("formSpecialtyLabel")}</label>
          <select id="resource-form-specialty"
            name="specialtyId"
            defaultValue={defaults?.specialtyId}
            disabled={!domainId}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue disabled:bg-gray-100"
          >
            <option value="">{t("formSelectSpecialtyPlaceholder")}</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <FieldErrors errors={state.errors?.specialtyId} />
        </div>

        <div>
          <label htmlFor="resource-form-university" className="mb-1 block text-sm font-medium">{t("formUniversityLabel")}</label>
          <select id="resource-form-university"
            name="universityId"
            value={universityId}
            onChange={(e) => setUniversityId(e.target.value)}
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
          <label htmlFor="resource-form-faculty" className="mb-1 block text-sm font-medium">{t("formFacultyLabel")}</label>
          <select id="resource-form-faculty"
            name="facultyId"
            defaultValue={defaults?.facultyId}
            disabled={!universityId}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue disabled:bg-gray-100"
          >
            <option value="">{t("formSelectFacultyPlaceholder")}</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <FieldErrors errors={state.errors?.facultyId} />
        </div>

        <div>
          <label htmlFor="resource-form-level" className="mb-1 block text-sm font-medium">{t("formLevelLabel")}</label>
          <input id="resource-form-level"
            name="level"
            defaultValue={defaults?.level}
            placeholder={t("formLevelPlaceholder")}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.level} />
        </div>

        <div>
          <label htmlFor="resource-form-year" className="mb-1 block text-sm font-medium">{t("formYearLabel")}</label>
          <input id="resource-form-year"
            name="year"
            type="number"
            defaultValue={defaults?.year ?? undefined}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.year} />
        </div>

        <div>
          <label htmlFor="resource-form-language" className="mb-1 block text-sm font-medium">{t("formLanguageLabel")}</label>
          <input id="resource-form-language"
            name="language"
            defaultValue={defaults?.language}
            placeholder={t("formLanguagePlaceholder")}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.language} />
        </div>

        <div>
          <label htmlFor="resource-form-keywords" className="mb-1 block text-sm font-medium">{t("formKeywordsLabel")}</label>
          <input id="resource-form-keywords"
            name="keywords"
            defaultValue={defaults?.keywords?.join(", ")}
            placeholder={t("formKeywordsPlaceholder")}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.keywords} />
        </div>
      </div>

      <div>
        <label htmlFor="resource-form-abstract" className="mb-1 block text-sm font-medium">{t("formAbstractLabel")}</label>
        <textarea id="resource-form-abstract"
          name="abstract"
          defaultValue={defaults?.abstract}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.abstract} />
      </div>

      <div>
        <label htmlFor="resource-form-description" className="mb-1 block text-sm font-medium">{t("formDescriptionLabel")}</label>
        <textarea id="resource-form-description"
          name="description"
          defaultValue={defaults?.description}
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.description} />
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
