"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { ResourceFormState } from "@/server/actions/resource.actions";
import type { DomainWithSpecialties, UniversityWithFaculties } from "@/server/services/taxonomy.service";

const RESOURCE_TYPES: { value: string; label: string }[] = [
  { value: "COURS", label: "Cours" },
  { value: "MEMOIRE", label: "Mémoire" },
  { value: "ARTICLE", label: "Article" },
  { value: "THESE", label: "Thèse" },
  { value: "LIVRE", label: "Livre" },
];

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
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-globanic-blue px-6 py-2.5 font-semibold text-white transition hover:bg-globanic-blueLight disabled:opacity-60"
    >
      {pending ? "جارٍ الحفظ..." : label}
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
        <label className="mb-1 block text-sm font-medium">العنوان *</label>
        <input
          name="title"
          defaultValue={defaults?.title}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.title} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">النوع *</label>
        <select
          name="type"
          defaultValue={defaults?.type}
          required
          disabled={lockType}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue disabled:bg-gray-100"
        >
          <option value="">اختر النوع</option>
          {RESOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {lockType && (
          <p className="mt-1 text-xs text-gray-500">لا يمكن تغيير نوع المورد بعد إنشائه.</p>
        )}
        <FieldErrors errors={state.errors?.type} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">اسم المؤلف *</label>
        <input
          name="authorName"
          defaultValue={defaults?.authorName}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <p className="mt-1 text-xs text-gray-500">
          إذا لم يكن هذا الاسم موجودًا في قاعدة البيانات، سيتم إنشاء ملف مؤلف جديد له تلقائيًا.
        </p>
        <FieldErrors errors={state.errors?.authorName} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">المجال *</label>
          <select
            name="domainId"
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          >
            <option value="">اختر المجال</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <FieldErrors errors={state.errors?.domainId} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">التخصص</label>
          <select
            name="specialtyId"
            defaultValue={defaults?.specialtyId}
            disabled={!domainId}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue disabled:bg-gray-100"
          >
            <option value="">اختر التخصص (اختياري)</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <FieldErrors errors={state.errors?.specialtyId} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">الجامعة</label>
          <select
            name="universityId"
            value={universityId}
            onChange={(e) => setUniversityId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          >
            <option value="">اختر الجامعة (اختياري)</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <FieldErrors errors={state.errors?.universityId} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">الكلية</label>
          <select
            name="facultyId"
            defaultValue={defaults?.facultyId}
            disabled={!universityId}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue disabled:bg-gray-100"
          >
            <option value="">اختر الكلية (اختياري)</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <FieldErrors errors={state.errors?.facultyId} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">المستوى</label>
          <input
            name="level"
            defaultValue={defaults?.level}
            placeholder="مثال: Master 1"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.level} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">السنة</label>
          <input
            name="year"
            type="number"
            defaultValue={defaults?.year ?? undefined}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.year} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">اللغة</label>
          <input
            name="language"
            defaultValue={defaults?.language}
            placeholder="مثال: fr"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.language} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">الكلمات المفتاحية</label>
          <input
            name="keywords"
            defaultValue={defaults?.keywords?.join(", ")}
            placeholder="مفصولة بفواصل"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.keywords} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">الملخص (Abstract)</label>
        <textarea
          name="abstract"
          defaultValue={defaults?.abstract}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.abstract} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">الوصف الكامل</label>
        <textarea
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
