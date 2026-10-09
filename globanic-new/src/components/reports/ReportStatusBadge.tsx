import type { ReportStatus } from "@prisma/client";

const STATUS_STYLES: Record<ReportStatus, { label: string; className: string }> = {
  OPEN: { label: "مفتوح", className: "bg-amber-100 text-amber-800" },
  RESOLVED: { label: "تم الحل", className: "bg-green-100 text-green-800" },
  DISMISSED: { label: "مرفوض", className: "bg-gray-200 text-gray-700" },
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
