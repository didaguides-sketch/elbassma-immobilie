"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReportStatus } from "@prisma/client";
import { resolveReportAction, dismissReportAction } from "@/server/actions/report.actions";

export function AdminReportActions({
  reportId,
  status,
}: {
  reportId: string;
  status: ReportStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (status !== "OPEN") {
    return null;
  }

  function run(action: () => Promise<{ success: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.message ?? "تعذر تنفيذ الإجراء.");
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          ملاحظة داخلية (اختياري — تُسجَّل في ModerationLog)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-globanic-blue"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending}
          onClick={() => run(() => resolveReportAction(reportId, note))}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {pending ? "جارٍ الإرسال..." : "حل البلاغ (Resolve)"}
        </button>
        <button
          disabled={pending}
          onClick={() => run(() => dismissReportAction(reportId, note))}
          className="rounded-lg border border-gray-400 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {pending ? "جارٍ الإرسال..." : "رفض البلاغ (Dismiss)"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
