"use client";

import { useState, useTransition } from "react";
import type { ReportType } from "@prisma/client";
import { submitReportAction } from "@/server/actions/report.actions";
import { REPORT_TYPES } from "@/lib/utils/report-labels";
import { useTranslations } from "@/components/i18n/I18nProvider";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

// Maps each ReportType to its Batch 5 dictionary key. report-labels.ts
// itself is intentionally left untouched — it's shared with the Admin
// Dashboard's reports page (out of scope for this batch) — this
// component now sources its own display text from the dictionary
// instead, while still importing REPORT_TYPES (just the key list/order,
// not display text) from the same unmodified file.
const REPORT_TYPE_DICT_KEYS: Record<ReportType, keyof Dictionary["resource"]> = {
  COPYRIGHT: "reportTypeCopyright",
  SPAM: "reportTypeSpam",
  INCORRECT_INFO: "reportTypeIncorrectInfo",
  BROKEN_FILE: "reportTypeBrokenFile",
  INAPPROPRIATE: "reportTypeInappropriate",
  OTHER: "reportTypeOther",
};

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
  const t = useTranslations("resource");

  if (done) {
    return <p className="text-body-sm text-emerald-700">{t("reportThankYouMessage")}</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-body-sm font-medium text-slate-500 underline decoration-dotted hover:text-slate-700"
      >
        {t("reportThisResourceButton")}
      </button>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitReportAction(resourceId, type, message, returnTo);
      if (!result.success) {
        setError(result.message ?? t("reportErrorFallback"));
        return;
      }
      setDone(true);
    });
  }

  return (
    <div className="rounded border border-slate-200 p-3">
      <label htmlFor="report-resource-form-reason" className="mb-1 block text-caption font-medium text-slate-600">{t("reportReasonLabel")}</label>
      <select id="report-resource-form-reason"
        value={type}
        onChange={(e) => setType(e.target.value as ReportType)}
        className="mb-2 w-full rounded border border-slate-300 px-3 py-2 text-body-sm outline-none focus:border-globanic-blue"
      >
        {REPORT_TYPES.map((rt) => (
          <option key={rt} value={rt}>
            {t(REPORT_TYPE_DICT_KEYS[rt])}
          </option>
        ))}
      </select>

      <label htmlFor="report-resource-form-details" className="mb-1 block text-caption font-medium text-slate-600">
        {t("reportAdditionalDetailsLabel")}
      </label>
      <textarea id="report-resource-form-details"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="mb-2 w-full rounded border border-slate-300 px-3 py-2 text-body-sm outline-none focus:border-globanic-blue"
      />

      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          onClick={handleSubmit}
          className="rounded bg-globanic-navy px-4 py-1.5 text-body-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? t("reportSubmitPending") : t("reportSubmitButton")}
        </button>
        <button
          disabled={pending}
          onClick={() => setOpen(false)}
          className="text-body-sm text-slate-500 hover:text-slate-700"
        >
          {t("reportCancelButton")}
        </button>
      </div>

      {error && <p className="mt-2 text-body-sm text-red-600">{error}</p>}
    </div>
  );
}
