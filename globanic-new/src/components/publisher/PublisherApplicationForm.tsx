"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  submitPublisherApplicationAction,
  type ApplicationFormState,
} from "@/server/actions/publisher-application.actions";
import type { DomainWithSpecialties, UniversityWithFaculties } from "@/server/services/taxonomy.service";

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
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-globanic-blue py-3 font-semibold text-white transition hover:bg-globanic-blueLight disabled:opacity-60"
    >
      {pending ? "جارٍ الإرسال..." : "إرسال الطلب"}
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
        <label className="mb-1 block text-sm font-medium">الاسم الكامل *</label>
        <input
          name="fullName"
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.fullName} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">الجامعة</label>
        <select
          name="universityId"
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
        <label className="mb-1 block text-sm font-medium">الصفة الأكاديمية *</label>
        <input
          name="academicStatus"
          required
          placeholder="مثال: أستاذ محاضر، طالب دكتوراه..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.academicStatus} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">التخصص</label>
        <select
          name="specialtyId"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        >
          <option value="">اختر التخصص (اختياري)</option>
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
        <label className="mb-1 block text-sm font-medium">البريد الإلكتروني الأكاديمي *</label>
        <input
          type="email"
          name="academicEmail"
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.academicEmail} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">معلومات إضافية</label>
        <textarea
          name="additionalInfo"
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.additionalInfo} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">مستند الإثبات (PDF أو صورة، حد أقصى 10MB) *</label>
        <input
          type="file"
          name="proofFile"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <p className="mt-1 text-xs text-gray-500">
          مثل بطاقة الطالب، شهادة عمل، أو أي دليل على الانتماء الأكاديمي. هذا المستند خاص ولن
          يكون مرئيًا لأي شخص سوى الإدارة.
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}
