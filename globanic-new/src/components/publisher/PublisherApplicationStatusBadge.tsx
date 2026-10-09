import type { PublisherApplicationStatus } from "@prisma/client";

const STATUS_STYLES: Record<PublisherApplicationStatus, { label: string; className: string }> = {
  PENDING: { label: "قيد المراجعة", className: "bg-amber-100 text-amber-800" },
  VERIFIED: { label: "موثّق", className: "bg-green-100 text-green-800" },
  REJECTED: { label: "مرفوض", className: "bg-red-100 text-red-800" },
  SUSPENDED: { label: "معلَّق", className: "bg-gray-200 text-gray-700" },
};

export function PublisherApplicationStatusBadge({ status }: { status: PublisherApplicationStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
