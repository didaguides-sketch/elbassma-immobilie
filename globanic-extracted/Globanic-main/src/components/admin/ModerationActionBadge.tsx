"use client";

import type { ModerationAction } from "@prisma/client";
import { useTranslations } from "@/components/i18n/I18nProvider";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type AdminKey = keyof Dictionary["adminDashboard"];

const ACTION_STYLES: Record<ModerationAction, { labelKey: AdminKey; className: string }> = {
  SUBMIT: { labelKey: "moderationActionSubmit", className: "bg-blue-100 text-blue-800" },
  APPROVE: { labelKey: "moderationActionApprove", className: "bg-green-100 text-green-800" },
  REJECT: { labelKey: "rejectCta", className: "bg-red-100 text-red-800" },
  REQUEST_CHANGES: { labelKey: "requestChangesCta", className: "bg-amber-100 text-amber-800" },
  UNPUBLISH: { labelKey: "moderationActionUnpublish", className: "bg-red-100 text-red-800" },
  DELETE: { labelKey: "deleteCta", className: "bg-red-100 text-red-800" },
  VERIFY_PUBLISHER: { labelKey: "moderationActionVerifyPublisher", className: "bg-green-100 text-green-800" },
  REJECT_PUBLISHER: { labelKey: "moderationActionRejectPublisher", className: "bg-red-100 text-red-800" },
  SUSPEND_PUBLISHER: { labelKey: "moderationActionSuspendPublisher", className: "bg-red-100 text-red-800" },
  SUSPEND_USER: { labelKey: "moderationActionSuspendUser", className: "bg-red-100 text-red-800" },
  ACTIVATE_USER: { labelKey: "moderationActionActivateUser", className: "bg-green-100 text-green-800" },
  CHANGE_ROLE: { labelKey: "moderationActionChangeRole", className: "bg-blue-100 text-blue-800" },
  RESOLVE_REPORT: { labelKey: "moderationActionResolveReport", className: "bg-green-100 text-green-800" },
  DISMISS_REPORT: { labelKey: "moderationActionDismissReport", className: "bg-slate-200 text-slate-700" },
  CREATE_UNIVERSITY: { labelKey: "moderationActionCreateUniversity", className: "bg-blue-100 text-blue-800" },
  UPDATE_UNIVERSITY: { labelKey: "moderationActionUpdateUniversity", className: "bg-amber-100 text-amber-800" },
  DELETE_UNIVERSITY: { labelKey: "moderationActionDeleteUniversity", className: "bg-red-100 text-red-800" },
  CREATE_DOMAIN: { labelKey: "moderationActionCreateDomain", className: "bg-blue-100 text-blue-800" },
  UPDATE_DOMAIN: { labelKey: "moderationActionUpdateDomain", className: "bg-amber-100 text-amber-800" },
  DELETE_DOMAIN: { labelKey: "moderationActionDeleteDomain", className: "bg-red-100 text-red-800" },
  FINALIZE_REVENUE_PERIOD: { labelKey: "moderationActionFinalizeRevenuePeriod", className: "bg-globanic-amber/10 text-globanic-amber" },
  MARK_PAYOUT_PAID: { labelKey: "moderationActionMarkPayoutPaid", className: "bg-green-100 text-green-800" },
  // Phase 17 payout subsystem — added during the pre-launch audit after
  // finding this Record<ModerationAction, ...> had not been kept in
  // sync with the schema's ModerationAction enum, which would have
  // failed to compile the moment `prisma generate` ran against the
  // updated schema (TypeScript requires every enum member covered).
  SUBMIT_PAYOUT_ACCOUNT: { labelKey: "moderationActionSubmitPayoutAccount", className: "bg-blue-100 text-blue-800" },
  UPDATE_PAYOUT_ACCOUNT: { labelKey: "moderationActionUpdatePayoutAccount", className: "bg-blue-100 text-blue-800" },
  VERIFY_PAYOUT_ACCOUNT: { labelKey: "moderationActionVerifyPayoutAccount", className: "bg-green-100 text-green-800" },
  REJECT_PAYOUT_ACCOUNT: { labelKey: "moderationActionRejectPayoutAccount", className: "bg-red-100 text-red-800" },
  DEACTIVATE_PAYOUT_ACCOUNT: { labelKey: "moderationActionDeactivatePayoutAccount", className: "bg-slate-200 text-slate-700" },
  REVEAL_PAYOUT_ACCOUNT_DETAILS: { labelKey: "moderationActionRevealPayoutAccountDetails", className: "bg-amber-100 text-amber-800" },
  APPROVE_PAYOUT: { labelKey: "moderationActionApprovePayout", className: "bg-blue-100 text-blue-800" },
  MARK_PAYOUT_FAILED: { labelKey: "moderationActionMarkPayoutFailed", className: "bg-red-100 text-red-800" },
  SET_PUBLISHER_SHARE_PERCENTAGE: { labelKey: "moderationActionSetPublisherSharePercentage", className: "bg-amber-100 text-amber-800" },
  // Phase 13.5B — publisher designates which VERIFIED account to use for
  // their next payout. Read-only w.r.t. money, but audited like every
  // other payout-account mutation above.
  SET_PREFERRED_PAYOUT_ACCOUNT: { labelKey: "moderationActionSetPreferredPayoutAccount", className: "bg-blue-100 text-blue-800" },
};

export function ModerationActionBadge({ action }: { action: ModerationAction }) {
  const t = useTranslations("adminDashboard");
  const style = ACTION_STYLES[action];
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold ${style.className}`}>
      {t(style.labelKey)}
    </span>
  );
}
