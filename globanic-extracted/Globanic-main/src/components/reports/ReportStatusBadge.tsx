"use client";

import type { ReportStatus } from "@prisma/client";
import { useTranslations } from "@/components/i18n/I18nProvider";

const STATUS_STYLES: Record<ReportStatus, { labelKey: string; className: string }> = {
  OPEN: { labelKey: "reportStatusOpen", className: "bg-amber-100 text-amber-800" },
  RESOLVED: { labelKey: "reportStatusResolved", className: "bg-green-100 text-green-800" },
  DISMISSED: { labelKey: "reportStatusDismissed", className: "bg-gray-200 text-gray-700" },
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const t = useTranslations("adminDashboard");
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
      {t(style.labelKey)}
    </span>
  );
}
