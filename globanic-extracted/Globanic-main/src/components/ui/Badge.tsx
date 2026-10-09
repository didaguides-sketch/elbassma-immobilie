import type { ReactNode } from "react";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * Generic badge — small, restrained (no rounded-full pill by default;
 * `rounded` token = 6px). Status communicates through a text label AND
 * a color, never color alone (accessibility item 37) — every consumer
 * below passes a real label, not just a colored dot.
 */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const toneClasses: Record<Tone, string> = {
    neutral: "bg-slate-100 text-slate-700",
    info: "bg-blue-50 text-globanic-blueDeep",
    success: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-globanic-amberDeep",
    danger: "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-caption font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

/**
 * PublisherPayout.status badge — one canonical mapping, meant to
 * replace the STATUS_LABEL/STATUS_STYLE object literals that were
 * duplicated across /publisher/earnings, /admin/payouts, and
 * PayoutRowActions during the payout subsystem build. Wiring existing
 * pages to this component is scoped for the Phase 13 pass (Earnings +
 * Payouts + Payout Settings) — NOT done in this Phase 1 commit, flagged
 * explicitly so it isn't mistaken for already having happened.
 */
const PAYOUT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "قيد الانتظار", tone: "neutral" },
  APPROVED: { label: "معتمدة", tone: "info" },
  PAID: { label: "مدفوعة", tone: "success" },
  FAILED: { label: "فشلت", tone: "danger" },
};

export function PayoutStatusBadge({ status }: { status: string }) {
  const entry = PAYOUT_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

const PAYOUT_ACCOUNT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING_REVIEW: { label: "قيد المراجعة", tone: "warning" },
  VERIFIED: { label: "موثّق", tone: "success" },
  REJECTED: { label: "مرفوض", tone: "danger" },
};

export function PayoutAccountStatusBadge({ status }: { status: string }) {
  const entry = PAYOUT_ACCOUNT_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
