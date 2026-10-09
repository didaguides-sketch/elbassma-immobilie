"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublisherApplicationStatus } from "@prisma/client";
import {
  verifyPublisherApplicationAction,
  rejectPublisherApplicationAction,
  suspendPublisherAction,
} from "@/server/actions/publisher-application.actions";

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
        setError(result.message ?? "تعذر تنفيذ الإجراء.");
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
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            توثيق كناشر (Verify)
          </button>
          <button
            disabled={pending}
            onClick={() => setMode(mode === "reject" ? "idle" : "reject")}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            رفض
          </button>
        </div>
      )}

      {status === "VERIFIED" && (
        <button
          disabled={pending}
          onClick={() => setMode(mode === "suspend" ? "idle" : "suspend")}
          className="rounded-lg border border-gray-400 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          تعليق صلاحيات الناشر
        </button>
      )}

      {(mode === "reject" || mode === "suspend") && (
        <div className="rounded-lg border border-gray-200 p-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {mode === "reject" ? "سبب الرفض *" : "سبب التعليق (اختياري)"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-globanic-blue"
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
