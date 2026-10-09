"use client";

import type { ResourceStatus } from "@prisma/client";
import { useTranslations } from "@/components/i18n/I18nProvider";

const STATUS_STYLES: Record<ResourceStatus, { labelKey: string; className: string }> = {
  DRAFT: { labelKey: "resourceStatusDraft", className: "bg-gray-100 text-gray-700" },
  SUBMITTED: { labelKey: "resourceStatusSubmitted", className: "bg-amber-100 text-amber-800" },
  UNDER_REVIEW: { labelKey: "resourceStatusUnderReview", className: "bg-amber-100 text-amber-800" },
  APPROVED: { labelKey: "resourceStatusApproved", className: "bg-blue-100 text-blue-800" },
  PUBLISHED: { labelKey: "resourceStatusPublished", className: "bg-green-100 text-green-800" },
  REJECTED: { labelKey: "resourceStatusRejected", className: "bg-red-100 text-red-800" },
  CHANGES_REQUESTED: { labelKey: "resourceStatusChangesRequested", className: "bg-orange-100 text-orange-800" },
  UNPUBLISHED: { labelKey: "resourceStatusUnpublished", className: "bg-gray-200 text-gray-700" },
};

export function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  const t = useTranslations("publisherDashboard");
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
      {t(style.labelKey)}
    </span>
  );
}
