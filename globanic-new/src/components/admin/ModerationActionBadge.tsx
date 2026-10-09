import type { ModerationAction } from "@prisma/client";

const ACTION_STYLES: Record<ModerationAction, { label: string; className: string }> = {
  SUBMIT: { label: "إرسال للمراجعة", className: "bg-blue-100 text-blue-800" },
  APPROVE: { label: "موافقة", className: "bg-green-100 text-green-800" },
  REJECT: { label: "رفض", className: "bg-red-100 text-red-800" },
  REQUEST_CHANGES: { label: "طلب تعديلات", className: "bg-amber-100 text-amber-800" },
  UNPUBLISH: { label: "إلغاء نشر", className: "bg-red-100 text-red-800" },
  DELETE: { label: "حذف", className: "bg-red-100 text-red-800" },
  VERIFY_PUBLISHER: { label: "تحقق من ناشر", className: "bg-green-100 text-green-800" },
  REJECT_PUBLISHER: { label: "رفض ناشر", className: "bg-red-100 text-red-800" },
  SUSPEND_PUBLISHER: { label: "تعليق ناشر", className: "bg-red-100 text-red-800" },
  SUSPEND_USER: { label: "تعليق مستخدم", className: "bg-red-100 text-red-800" },
  ACTIVATE_USER: { label: "تفعيل مستخدم", className: "bg-green-100 text-green-800" },
  CHANGE_ROLE: { label: "تغيير الدور", className: "bg-blue-100 text-blue-800" },
  RESOLVE_REPORT: { label: "حل بلاغ", className: "bg-green-100 text-green-800" },
  DISMISS_REPORT: { label: "رفض بلاغ", className: "bg-gray-200 text-gray-700" },
  CREATE_UNIVERSITY: { label: "إنشاء جامعة", className: "bg-blue-100 text-blue-800" },
  UPDATE_UNIVERSITY: { label: "تعديل جامعة", className: "bg-amber-100 text-amber-800" },
  DELETE_UNIVERSITY: { label: "حذف جامعة", className: "bg-red-100 text-red-800" },
  CREATE_DOMAIN: { label: "إنشاء مجال", className: "bg-blue-100 text-blue-800" },
  UPDATE_DOMAIN: { label: "تعديل مجال", className: "bg-amber-100 text-amber-800" },
  DELETE_DOMAIN: { label: "حذف مجال", className: "bg-red-100 text-red-800" },
};

export function ModerationActionBadge({ action }: { action: ModerationAction }) {
  const style = ACTION_STYLES[action];
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
