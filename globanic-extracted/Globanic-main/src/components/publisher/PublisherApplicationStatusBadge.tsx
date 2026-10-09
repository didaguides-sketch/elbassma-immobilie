"use client";

import type { PublisherApplicationStatus } from "@prisma/client";
import { useTranslations } from "@/components/i18n/I18nProvider";

const STATUS_STYLES: Record<PublisherApplicationStatus, { labelKey: string; className: string }> = {
  PENDING: { labelKey: "appStatusPending", className: "bg-amber-100 text-amber-800" },
  VERIFIED: { labelKey: "appStatusVerified", className: "bg-green-100 text-green-800" },
  REJECTED: { labelKey: "appStatusRejected", className: "bg-red-100 text-red-800" },
  SUSPENDED: { labelKey: "appStatusSuspended", className: "bg-gray-200 text-gray-700" },
};

export function PublisherApplicationStatusBadge({ status }: { status: PublisherApplicationStatus }) {
  const t = useTranslations("publisherDashboard");
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
      {t(style.labelKey)}
    </span>
  );
}
