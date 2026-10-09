"use client";

import { useState, useTransition } from "react";
import type { ReportType } from "@prisma/client";
import { submitReportAction } from "@/server/actions/report.actions";
import { REPORT_TYPE_LABELS, REPORT_TYPES } from "@/lib/utils/report-labels";

export function ReportResourceForm({
  resourceId,
  returnTo,
}: {
  resourceId: string;
  returnTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ReportType>("OTHER");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="text-sm text-green-700">شكرًا لك، تم إرسال بلاغك للمراجعة.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-gray-500 underline decoration-dotted hover:text-gray-700"
      >
        الإبلاغ عن هذا المورد
      </button>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitReportAction(resourceId, type, message, returnTo);
      if (!result.success) {
        setError(result.message ?? "تعذر إرسال البلاغ.");
        return;
      }
      setDone(true);
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <label className="mb-1 block text-xs font-medium text-gray-600">سبب الإبلاغ</label>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ReportType)}
        className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-globanic-blue"
      >
        {REPORT_TYPES.map((t) => (
          <option key={t} value={t}>
            {REPORT_TYPE_LABELS[t]}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs font-medium text-gray-600">
        تفاصيل إضافية (اختياري)
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-globanic-blue"
      />

      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          onClick={handleSubmit}
          className="rounded-lg bg-globanic-blue px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "جارٍ الإرسال..." : "إرسال البلاغ"}
        </button>
        <button
          disabled={pending}
          onClick={() => setOpen(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          إلغاء
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
