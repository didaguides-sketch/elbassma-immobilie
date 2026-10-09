"use client";

import { useFormState, useFormStatus } from "react-dom";
import { uploadResourceDocumentAction, type UploadFormState } from "@/server/actions/resource-upload.actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-globanic-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-globanic-blueLight disabled:opacity-60"
    >
      {pending ? "جارٍ الرفع..." : "رفع نسخة جديدة"}
    </button>
  );
}

export function ResourceDocumentUploadForm({ resourceId }: { resourceId: string }) {
  const boundAction = uploadResourceDocumentAction.bind(null, resourceId);
  const [state, formAction] = useFormState(boundAction, { success: false } as UploadFormState);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-gray-200 p-4">
      <div>
        <label className="mb-1 block text-sm font-medium">ملف PDF (حد أقصى 50MB)</label>
        <input
          type="file"
          name="file"
          accept="application/pdf,.pdf"
          required
          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">ملاحظة على هذه النسخة (اختياري)</label>
        <input
          type="text"
          name="changeNote"
          placeholder="مثال: تصحيح الصفحة 4"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-globanic-blue"
        />
      </div>
      {state.message && (
        <p className={`text-sm ${state.success ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
      <SubmitButton />
    </form>
  );
}
