"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublisherApplicationStatus } from "@prisma/client";
import {
  verifyPublisherApplicationAction,
  rejectPublisherApplicationAction,
  suspendPublisherAction,
} from "@/server/actions/publisher-application.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

type Mode = "idle" | "reject" | "suspend";

export function AdminPublisherApplicationActions({
  applicationId,
  targetUserId,
  status,
}: {
  applicationId: string;
  targetUserId: string;
  status: PublisherApplicationStatus;
}) {
  const t = useTranslations("adminDashboard");
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

  if (status !== "PENDING" && status !== "VERIFIED") return null;

  return (
    <div className="space-y-2">
      {status === "PENDING" && (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={pending}
            onClick={() => run(() => verifyPublisherApplicationAction(applicationId))}
            className="rounded bg-green-600 px-3 py-1.5 text-body-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {t("verifyPublisherCta")}
          </button>
          <button
            disabled={pending}
            onClick={() => setMode(mode === "reject" ? "idle" : "reject")}
            className="rounded bg-red-600 px-3 py-1.5 text-body-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {t("rejectCta")}
          </button>
        </div>
      )}

      {status === "VERIFIED" && (
        <button
          disabled={pending}
          onClick={() => setMode(mode === "suspend" ? "idle" : "suspend")}
          className="rounded border border-slate-300 px-3 py-1.5 text-body-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {t("suspendPublisherPrivilegesCta")}
        </button>
      )}

      {(mode === "reject" || mode === "suspend") && (
        <div className="rounded border border-slate-200 p-3">
          <label htmlFor={`admin-publisher-application-reason-${applicationId}`} className="mb-1 block text-caption font-medium text-slate-600">
            {mode === "reject" ? t("rejectionReasonRequiredLabel") : t("suspensionReasonLabel")}
          </label>
          <textarea id={`admin-publisher-application-reason-${applicationId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mb-2 w-full rounded border border-slate-300 px-3 py-2 text-body-sm outline-none focus:border-globanic-blue"
          />
          <button
            disabled={pending || (mode === "reject" && !reason.trim())}
            onClick={() =>
              run(() =>
                mode === "reject"
                  ? rejectPublisherApplicationAction(applicationId, reason)
                  : suspendPublisherAction(targetUserId, reason),
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
