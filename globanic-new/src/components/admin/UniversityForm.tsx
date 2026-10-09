"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { UniversityFormState } from "@/server/actions/admin-university.actions";

type Defaults = {
  name?: string;
  city?: string | null;
  country?: string | null;
  logoUrl?: string | null;
  officialWebsite?: string | null;
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

export function UniversityForm({
  action,
  defaults,
  submitLabel,
  redirectOnSuccess,
}: {
  action: (prevState: UniversityFormState, formData: FormData) => Promise<UniversityFormState>;
  defaults?: Defaults;
  submitLabel: string;
  /** Where to navigate after a successful create (edit stays on the page). */
  redirectOnSuccess?: string;
}) {
  const [state, formAction] = useFormState(action, { success: false } as UniversityFormState);
  const router = useRouter();

  useEffect(() => {
    if (state.success && redirectOnSuccess) {
      router.push(redirectOnSuccess);
    }
  }, [state.success, redirectOnSuccess, router]);

  return (
    <form action={formAction} className="space-y-5">
      {state.message && !state.success && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.message}</div>
      )}
      {state.message && state.success && !redirectOnSuccess && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{state.message}</div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">اسم الجامعة *</label>
        <input
          name="name"
          defaultValue={defaults?.name}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">المدينة</label>
          <input
            name="city"
            defaultValue={defaults?.city ?? undefined}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.city} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">الدولة</label>
          <input
            name="country"
            defaultValue={defaults?.country ?? undefined}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
          />
          <FieldErrors errors={state.errors?.country} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">رابط الشعار (Logo URL)</label>
        <input
          name="logoUrl"
          type="url"
          defaultValue={defaults?.logoUrl ?? undefined}
          placeholder="https://..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.logoUrl} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">الموقع الرسمي</label>
        <input
          name="officialWebsite"
          type="url"
          defaultValue={defaults?.officialWebsite ?? undefined}
          placeholder="https://..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        <FieldErrors errors={state.errors?.officialWebsite} />
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
