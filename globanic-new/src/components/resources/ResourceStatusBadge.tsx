import type { ResourceStatus } from "@prisma/client";

const STATUS_STYLES: Record<ResourceStatus, { label: string; className: string }> = {
  DRAFT: { label: "مسودة", className: "bg-gray-100 text-gray-700" },
  SUBMITTED: { label: "قيد الانتظار", className: "bg-amber-100 text-amber-800" },
  UNDER_REVIEW: { label: "قيد المراجعة", className: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "موافق عليه", className: "bg-blue-100 text-blue-800" },
  PUBLISHED: { label: "منشور", className: "bg-green-100 text-green-800" },
  REJECTED: { label: "مرفوض", className: "bg-red-100 text-red-800" },
  CHANGES_REQUESTED: { label: "تعديلات مطلوبة", className: "bg-orange-100 text-orange-800" },
  UNPUBLISHED: { label: "غير منشور", className: "bg-gray-200 text-gray-700" },
};

export function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
