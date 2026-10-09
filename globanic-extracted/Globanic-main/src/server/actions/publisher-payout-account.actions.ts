"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { ForbiddenError } from "@/server/auth/rbac";
import { ValidationError } from "@/server/services/resource.service";
import { submitPayoutAccount, setPreferredPayoutAccount } from "@/server/services/payout-account.service";
import { ccpPayoutAccountSchema } from "@/lib/validation/payout-account.schema";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export type PayoutAccountFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

async function requirePublisherSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/publisher/payout-settings");
  }
  return session;
}

// Maps the stable Zod error codes from payout-account.schema.ts's
// ccpPayoutAccountSchema to a localized display string. Same
// convention as resource.actions.ts's localizeFieldErrors (Batch 6) /
// auth.actions.ts's (Batch 4).
function localizeFieldErrors(
  fieldErrors: Record<string, string[]>,
  dict: Dictionary,
): Record<string, string[]> {
  const codeToMessage: Record<string, string> = {
    ccpAccountNumberInvalid: dict.publisherDashboard.errorCcpAccountNumberInvalid,
    ccpKeyInvalid: dict.publisherDashboard.errorCcpKeyInvalid,
    ripInvalid: dict.publisherDashboard.errorRipInvalid,
    legalFullNameRequired: dict.publisherDashboard.errorLegalFullNameRequired,
  };

  const localized: Record<string, string[]> = {};
  for (const [field, codes] of Object.entries(fieldErrors)) {
    localized[field] = codes.map((code) => codeToMessage[code] ?? code);
  }
  return localized;
}

/**
 * NOTE (Batch 6): ValidationError's own `error.message` is passed
 * through unchanged here — those messages originate in the service
 * layer, outside this batch's explicit action-file scope. Disclosed in
 * the Batch 6 freeze report.
 */
function toFormState(error: unknown, dict: Dictionary): PayoutAccountFormState {
  if (error instanceof ForbiddenError) {
    return { success: false, message: dict.publisherDashboard.errorForbiddenGeneric };
  }
  if (error instanceof ValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[publisher-payout-account.actions] unexpected error:", error);
  return { success: false, message: dict.publisherDashboard.errorUnexpectedGeneric };
}

/**
 * CCP/Baridi Mob only for now — the form this action serves is method-
 * specific. When a second method ships, add a sibling action
 * (submitBankTransferPayoutAccountAction, etc.) rather than branching
 * this one on a generic "method" field from an untyped FormData, so each
 * method's own zod schema stays the single source of truth for its shape.
 */
export async function submitCcpPayoutAccountAction(
  _prevState: PayoutAccountFormState,
  formData: FormData,
): Promise<PayoutAccountFormState> {
  const session = await requirePublisherSession();
  const dict = await getDictionary(await getLocale());

  const parsed = ccpPayoutAccountSchema.safeParse({
    method: "CCP_BARIDIMOB",
    legalFullName: formData.get("legalFullName"),
    country: "DZ",
    ccpAccountNumber: formData.get("ccpAccountNumber"),
    ccpKey: formData.get("ccpKey"),
    rip: formData.get("rip") ?? "",
  });

  if (!parsed.success) {
    return { success: false, errors: localizeFieldErrors(parsed.error.flatten().fieldErrors, dict) };
  }

  try {
    await submitPayoutAccount({ id: session.user.id, role: session.user.role }, parsed.data);
    revalidatePath("/publisher/payout-settings");
    return {
      success: true,
      message: dict.publisherDashboard.successPayoutAccountSubmitted,
    };
  } catch (error) {
    return toFormState(error, dict);
  }
}

/**
 * Phase 13.5B: publisher marks one of their own VERIFIED, active
 * accounts as the one to use for their next payout. Plain callable
 * action (not tied to a <form>/FormData) since the only input is an id
 * already known server-side to belong to a listed account — same shape
 * as submitResourceAction/deleteResourceAction, called from a small
 * client button via useTransition.
 */
export async function setPreferredPayoutAccountAction(
  payoutAccountId: string,
): Promise<PayoutAccountFormState> {
  const session = await requirePublisherSession();
  const dict = await getDictionary(await getLocale());

  try {
    await setPreferredPayoutAccount(
      { id: session.user.id, role: session.user.role },
      payoutAccountId,
    );
    revalidatePath("/publisher/payout-settings");
    return { success: true, message: dict.publisherDashboard.successPreferredAccountSet };
  } catch (error) {
    return toFormState(error, dict);
  }
}
