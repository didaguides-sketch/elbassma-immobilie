"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteResourceAction } from "@/server/actions/resource.actions";

export function DeleteDraftButton({
  resourceId,
  redirectTo,
}: {
  resourceId: string;
  redirectTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    if (!window.confirm("هل أنت متأكد من حذف هذه المسودة؟ لا يمكن التراجع عن هذا الإجراء.")) {
      return;
    }
    startTransition(async () => {
      const result = await deleteResourceAction(resourceId);
      if (!result.success) {
        setError(result.message ?? "تعذر حذف المسودة.");
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? "جارٍ الحذف..." : "حذف المسودة"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
