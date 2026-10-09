import type { ReportType } from "@prisma/client";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  COPYRIGHT: "انتهاك حقوق الملكية",
  SPAM: "محتوى غير مرغوب فيه (Spam)",
  INCORRECT_INFO: "معلومات غير صحيحة",
  BROKEN_FILE: "الملف تالف أو لا يعمل",
  INAPPROPRIATE: "محتوى غير لائق",
  OTHER: "أخرى",
};

export const REPORT_TYPES = Object.keys(REPORT_TYPE_LABELS) as ReportType[];
