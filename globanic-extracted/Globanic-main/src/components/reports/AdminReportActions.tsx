"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReportStatus } from "@prisma/client";
import { resolveReportAction, dismissReportAction } from "@/server/actions/report.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function AdminReportActions({
  reportId,
  status,
}: {
  reportId: string;
  status: ReportStatus;
}) {
  const t = useTranslations("adminDashboard");
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
        setError(result.message ?? t("actionErrorFallback"));
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={`admin-report-note-${reportId}`} className="mb-1 block text-caption font-medium text-slate-600">
          {t("internalNoteLabel")}
        </label>
        <textarea id={`admin-report-note-${reportId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded border border-slate-300 px-3 py-2 text-body-sm outline-none focus:border-globanic-blue"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending}
          onClick={() => run(() => resolveReportAction(reportId, note))}
          className="rounded bg-green-600 px-3 py-1.5 text-body-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {pending ? t("sendingPending") : t("resolveCta")}
        </button>
        <button
          disabled={pending}
          onClick={() => run(() => dismissReportAction(reportId, note))}
          className="rounded border border-slate-300 px-3 py-1.5 text-body-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {pending ? t("sendingPending") : t("dismissCta")}
        </button>
      </div>

      {error && <p className="text-body-sm text-red-600">{error}</p>}
    </div>
  );
}
