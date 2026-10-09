"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  uploadResourceCoverAction,
  deleteResourceCoverAction,
  type UploadFormState,
} from "@/server/actions/resource-upload.actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-globanic-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-globanic-blueLight disabled:opacity-60"
    >
      {pending ? "جارٍ الرفع..." : "رفع / تغيير صورة الغلاف"}
    </button>
  );
}

export function ResourceCoverUploadForm({
  resourceId,
  hasCover,
}: {
  resourceId: string;
  hasCover: boolean;
}) {
  const boundAction = uploadResourceCoverAction.bind(null, resourceId);
  const [state, formAction] = useFormState(boundAction, { success: false } as UploadFormState);

  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  function handleDelete() {
    setDeleteError(null);
    if (!window.confirm("هل تريد حذف صورة الغلاف؟")) return;
    startDeleteTransition(async () => {
      const result = await deleteResourceCoverAction(resourceId);
      if (!result.success) {
        setDeleteError(result.message ?? "تعذر حذف صورة الغلاف.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
      {hasCover && (
        // The route below is permission-checked server-side on every
        // request (see /api/resources/[id]/cover) — not a bare storage URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/resources/${resourceId}/cover`}
          alt="صورة الغلاف الحالية"
          className="h-40 w-32 rounded-lg border border-gray-100 object-cover"
        />
      )}

      <form action={formAction} className="space-y-2">
        <label className="mb-1 block text-sm font-medium">
          صورة الغلاف (JPEG / PNG / WEBP، حد أقصى 5MB)
        </label>
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        {state.message && (
          <p className={`text-sm ${state.success ? "text-green-700" : "text-red-600"}`}>
            {state.message}
          </p>
        )}
        <SubmitButton />
      </form>

      {hasCover && (
        <div>
          <button
            onClick={handleDelete}
            disabled={deletePending}
            className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
          >
            {deletePending ? "جارٍ الحذف..." : "حذف صورة الغلاف"}
          </button>
          {deleteError && <p className="mt-1 text-sm text-red-600">{deleteError}</p>}
        </div>
      )}
    </div>
  );
}
