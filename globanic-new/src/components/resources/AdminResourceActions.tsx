"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ResourceStatus } from "@prisma/client";
import {
  approveResourceAction,
  rejectResourceAction,
  requestChangesResourceAction,
  unpublishResourceAction,
} from "@/server/actions/admin-resource.actions";

type Mode = "idle" | "reject" | "changes";

export function AdminResourceActions({
  resourceId,
  status,
}: {
  resourceId: string;
  status: ResourceStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isReviewable = status === "SUBMITTED" || status === "UNDER_REVIEW";
  const isPublished = status === "PUBLISHED";

  function run(action: () => Promise<{ success: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.message ?? "تعذر تنفيذ الإجراء.");
        return;
      }
      setMode("idle");
      setReason("");
      router.refresh();
    });
  }

  if (!isReviewable && !isPublished) {
    return null;
  }

  return (
    <div className="space-y-2">
      {isReviewable && (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={pending}
            onClick={() => run(() => approveResourceAction(resourceId))}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            نشر (Approve)
          </button>
          <button
            disabled={pending}
            onClick={() => setMode(mode === "reject" ? "idle" : "reject")}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            رفض
          </button>
          <button
            disabled={pending}
            onClick={() => setMode(mode === "changes" ? "idle" : "changes")}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            طلب تعديلات
          </button>
        </div>
      )}

      {isPublished && (
        <button
          disabled={pending}
          onClick={() => run(() => unpublishResourceAction(resourceId))}
          className="rounded-lg border border-gray-400 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          إلغاء النشر
        </button>
      )}

      {(mode === "reject" || mode === "changes") && (
        <div className="rounded-lg border border-gray-200 p-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {mode === "reject" ? "سبب الرفض *" : "توضيح التعديلات المطلوبة *"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-globanic-blue"
          />
          <button
            disabled={pending || !reason.trim()}
            onClick={() =>
              run(() =>
                mode === "reject"
                  ? rejectResourceAction(resourceId, reason)
                  : requestChangesResourceAction(resourceId, reason),
              )
            }
            className="rounded-lg bg-globanic-blue px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "جارٍ الإرسال..." : "تأكيد"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
