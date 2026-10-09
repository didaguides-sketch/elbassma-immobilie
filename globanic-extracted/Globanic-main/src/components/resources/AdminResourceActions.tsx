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
import { useTranslations } from "@/components/i18n/I18nProvider";

type Mode = "idle" | "reject" | "changes";

export function AdminResourceActions({
  resourceId,
  status,
}: {
  resourceId: string;
  status: ResourceStatus;
}) {
  const t = useTranslations("adminDashboard");
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
        setError(result.message ?? t("actionErrorFallback"));
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
            className="rounded bg-green-600 px-3 py-1.5 text-body-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {t("approveCta")}
          </button>
          <button
            disabled={pending}
            onClick={() => setMode(mode === "reject" ? "idle" : "reject")}
            className="rounded bg-red-600 px-3 py-1.5 text-body-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {t("rejectCta")}
          </button>
          <button
            disabled={pending}
            onClick={() => setMode(mode === "changes" ? "idle" : "changes")}
            className="rounded bg-orange-500 px-3 py-1.5 text-body-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {t("requestChangesCta")}
          </button>
        </div>
      )}

      {isPublished && (
        <button
          disabled={pending}
          onClick={() => run(() => unpublishResourceAction(resourceId))}
          className="rounded border border-slate-300 px-3 py-1.5 text-body-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {t("unpublishCta")}
        </button>
      )}

      {(mode === "reject" || mode === "changes") && (
        <div className="rounded border border-slate-200 p-3">
          <label htmlFor={`admin-resource-reason-${resourceId}`} className="mb-1 block text-caption font-medium text-slate-600">
            {mode === "reject" ? t("rejectionReasonRequiredLabel") : t("changesRequiredLabel")}
          </label>
          <textarea id={`admin-resource-reason-${resourceId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mb-2 w-full rounded border border-slate-300 px-3 py-2 text-body-sm outline-none focus:border-globanic-blue"
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
            className="rounded bg-globanic-blue px-4 py-1.5 text-body-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? t("sendingPending") : t("confirmCta")}
          </button>
        </div>
      )}

      {error && <p className="text-body-sm text-red-600">{error}</p>}
    </div>
  );
}
