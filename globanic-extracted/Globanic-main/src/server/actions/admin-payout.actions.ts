"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { ForbiddenError } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import {
  verifyPayoutAccount,
  rejectPayoutAccount,
  revealPayoutAccountDetails,
} from "@/server/services/payout-account.service";
import { createRevenuePeriod, finalizeRevenuePeriod, setPublisherSharePercentageOverride } from "@/server/services/revenue-period.service";
import { approvePayout, markPayoutPaid, markPayoutFailed } from "@/server/services/payout.service";
import { rejectPayoutAccountSchema } from "@/lib/validation/payout-account.schema";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export type AdminPayoutFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

async function requireAdminSession(callbackPath: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  return session;
}

function localizeFieldErrors(
  fieldErrors: Record<string, string[]>,
  dict: Dictionary,
): Record<string, string[]> {
  const codeToMessage: Record<string, string> = {
    rejectionReasonRequired: dict.adminDashboard.errorRejectionReasonRequired,
  };
  const localized: Record<string, string[]> = {};
  for (const [field, codes] of Object.entries(fieldErrors)) {
    localized[field] = codes.map((code) => codeToMessage[code] ?? code);
  }
  return localized;
}

/**
 * NOTE (Batch 7C): ValidationError's own `error.message` is passed
 * through unchanged here — those messages originate in
 * payout-account.service.ts / revenue-period.service.ts /
 * payout.service.ts (business-logic/service layer), outside this
 * batch's explicit action-file scope. Same disclosed exception pattern
 * as Batch 6/7A/7B.
 */
function toFormState(error: unknown, dict: Dictionary): AdminPayoutFormState {
  if (error instanceof ForbiddenError) return { success: false, message: dict.adminDashboard.errorUnauthorizedGeneric };
  if (error instanceof NotFoundError) return { success: false, message: dict.adminDashboard.errorItemNotFound };
  if (error instanceof ValidationError) return { success: false, message: error.message };
  // eslint-disable-next-line no-console
  console.error("[admin-payout.actions] unexpected error:", error);
  return { success: false, message: dict.adminDashboard.errorUnexpectedRetry };
}

// ------------------------------------------------------------
// Payout accounts
// ------------------------------------------------------------

export async function verifyPayoutAccountAction(
  payoutAccountId: string,
): Promise<AdminPayoutFormState> {
  const session = await requireAdminSession("/admin/payout-accounts");
  const dict = await getDictionary(await getLocale());
  try {
    await verifyPayoutAccount({ id: session.user.id, role: session.user.role }, payoutAccountId);
    revalidatePath("/admin/payout-accounts");
    return { success: true, message: dict.adminDashboard.successPayoutAccountVerified };
  } catch (error) {
    return toFormState(error, dict);
  }
}

export async function rejectPayoutAccountAction(
  _prevState: AdminPayoutFormState,
  formData: FormData,
): Promise<AdminPayoutFormState> {
  const session = await requireAdminSession("/admin/payout-accounts");
  const dict = await getDictionary(await getLocale());

  const parsed = rejectPayoutAccountSchema.safeParse({
    payoutAccountId: formData.get("payoutAccountId"),
    rejectionReason: formData.get("rejectionReason"),
  });
  if (!parsed.success) {
    return { success: false, errors: localizeFieldErrors(parsed.error.flatten().fieldErrors, dict) };
  }

  try {
    await rejectPayoutAccount(
      { id: session.user.id, role: session.user.role },
      parsed.data.payoutAccountId,
      parsed.data.rejectionReason,
    );
    revalidatePath("/admin/payout-accounts");
    return { success: true, message: dict.adminDashboard.successPayoutAccountRejected };
  } catch (error) {
    return toFormState(error, dict);
  }
}

/**
 * Returns decrypted CCP/RIP fields for a single review action — the
 * caller (a client component behind an explicit "Reveal" button, never
 * rendered by default) is responsible for not persisting this anywhere.
 * Every successful call is already audit-logged inside
 * revealPayoutAccountDetails. Wrapped in try/catch (unlike a bare
 * pass-through) so a ForbiddenError from a non-admin caller comes back
 * as a typed, handleable result instead of an unhandled Server Action
 * rejection — found during the payout security audit.
 */
export type RevealPayoutAccountResult =
  | { success: true; details: Record<string, unknown> }
  | { success: false; message: string };

export async function revealPayoutAccountDetailsAction(
  payoutAccountId: string,
): Promise<RevealPayoutAccountResult> {
  const session = await requireAdminSession("/admin/payout-accounts");
  const dict = await getDictionary(await getLocale());
  try {
    const result = await revealPayoutAccountDetails(
      { id: session.user.id, role: session.user.role },
      payoutAccountId,
    );
    return { success: true, details: result.details as Record<string, unknown> };
  } catch (error) {
    const state = toFormState(error, dict);
    return { success: false, message: state.message ?? dict.adminDashboard.errorUnexpectedNoRetry };
  }
}

// ------------------------------------------------------------
// Revenue periods
// ------------------------------------------------------------

export async function createRevenuePeriodAction(
  _prevState: AdminPayoutFormState,
  formData: FormData,
): Promise<AdminPayoutFormState> {
  const session = await requireAdminSession("/admin/revenue-periods");
  const dict = await getDictionary(await getLocale());

  const label = String(formData.get("label") ?? "").trim();
  const periodStart = new Date(String(formData.get("periodStart")));
  const periodEnd = new Date(String(formData.get("periodEnd")));
  // Admin enters the real AdSense revenue figure in whole currency units
  // (e.g. DZD), converted to cents here — never guessed by this app.
  const totalRevenueUnits = Number(formData.get("totalRevenue"));

  if (!label || Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || Number.isNaN(totalRevenueUnits)) {
    return { success: false, message: dict.adminDashboard.errorFillAllFieldsCorrectly };
  }

  try {
    await createRevenuePeriod(
      { id: session.user.id, role: session.user.role },
      { label, periodStart, periodEnd, totalRevenueCents: Math.round(totalRevenueUnits * 100) },
    );
    revalidatePath("/admin/revenue-periods");
    return { success: true, message: dict.adminDashboard.successRevenuePeriodCreated };
  } catch (error) {
    return toFormState(error, dict);
  }
}

export async function finalizeRevenuePeriodAction(revenuePeriodId: string): Promise<AdminPayoutFormState> {
  const session = await requireAdminSession("/admin/revenue-periods");
  const dict = await getDictionary(await getLocale());
  try {
    await finalizeRevenuePeriod({ id: session.user.id, role: session.user.role }, revenuePeriodId);
    revalidatePath("/admin/revenue-periods");
    revalidatePath("/admin/payouts");
    return { success: true, message: dict.adminDashboard.successRevenuePeriodFinalized };
  } catch (error) {
    return toFormState(error, dict);
  }
}

/**
 * percentage = null clears the override (publisher reverts to the
 * platform default). Empty string from a cleared form field also means
 * "clear" — normalized here so the UI can just submit an empty input.
 */
export async function setPublisherSharePercentageAction(
  _prevState: AdminPayoutFormState,
  formData: FormData,
): Promise<AdminPayoutFormState> {
  const session = await requireAdminSession("/admin/payout-accounts");
  const dict = await getDictionary(await getLocale());

  const publisherUserId = String(formData.get("publisherUserId") ?? "");
  const raw = String(formData.get("payoutSharePercentage") ?? "").trim();
  const percentage = raw === "" ? null : Number(raw);

  if (!publisherUserId) return { success: false, message: dict.adminDashboard.errorPublisherIdMissing };
  if (percentage !== null && Number.isNaN(percentage)) {
    return { success: false, message: dict.adminDashboard.errorInvalidPercentage };
  }

  try {
    await setPublisherSharePercentageOverride({ id: session.user.id, role: session.user.role }, publisherUserId, percentage);
    revalidatePath("/admin/payout-accounts");
    return {
      success: true,
      message: percentage === null ? dict.adminDashboard.successShareResetToDefault : dict.adminDashboard.successShareUpdated,
    };
  } catch (error) {
    return toFormState(error, dict);
  }
}

// ------------------------------------------------------------
// Payout lifecycle
// ------------------------------------------------------------

export async function approvePayoutAction(payoutId: string): Promise<AdminPayoutFormState> {
  const session = await requireAdminSession("/admin/payouts");
  const dict = await getDictionary(await getLocale());
  try {
    await approvePayout({ id: session.user.id, role: session.user.role }, payoutId);
    revalidatePath("/admin/payouts");
    return { success: true, message: dict.adminDashboard.successPayoutApproved };
  } catch (error) {
    return toFormState(error, dict);
  }
}

export async function markPayoutPaidAction(
  _prevState: AdminPayoutFormState,
  formData: FormData,
): Promise<AdminPayoutFormState> {
  const session = await requireAdminSession("/admin/payouts");
  const dict = await getDictionary(await getLocale());

  const payoutId = String(formData.get("payoutId") ?? "");
  const transactionReference = String(formData.get("transactionReference") ?? "");
  const paidAtRaw = formData.get("paidAt");
  const paidAt = paidAtRaw ? new Date(String(paidAtRaw)) : undefined;

  if (!payoutId) return { success: false, message: dict.adminDashboard.errorPayoutIdMissing };

  try {
    await markPayoutPaid({ id: session.user.id, role: session.user.role }, payoutId, {
      transactionReference,
      paidAt,
    });
    revalidatePath("/admin/payouts");
    return { success: true, message: dict.adminDashboard.successPayoutMarkedPaid };
  } catch (error) {
    return toFormState(error, dict);
  }
}

export async function markPayoutFailedAction(
  _prevState: AdminPayoutFormState,
  formData: FormData,
): Promise<AdminPayoutFormState> {
  const session = await requireAdminSession("/admin/payouts");
  const dict = await getDictionary(await getLocale());

  const payoutId = String(formData.get("payoutId") ?? "");
  const failureReason = String(formData.get("failureReason") ?? "");
  if (!payoutId) return { success: false, message: dict.adminDashboard.errorPayoutIdMissing };

  try {
    await markPayoutFailed({ id: session.user.id, role: session.user.role }, payoutId, failureReason);
    revalidatePath("/admin/payouts");
    return { success: true, message: dict.adminDashboard.successPayoutMarkedFailed };
  } catch (error) {
    return toFormState(error, dict);
  }
}
