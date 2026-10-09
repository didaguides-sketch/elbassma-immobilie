import { z } from "zod";

/**
 * One schema per PayoutMethod. Adding a new method later (BANK_TRANSFER_INTL,
 * WISE, PAYPAL) means adding one object here + one branch in the
 * discriminated union — never touching the CCP branch or the database
 * schema. This is what makes the subsystem extensible per the product
 * requirement.
 */

// NOTE (Phase 16B, Batch 6): the CCP-branch messages below are now
// stable error CODES (not display strings), mapped to a localized
// string in publisher-payout-account.actions.ts — same convention as
// auth.schema.ts (Batch 4). Validation rules (regex patterns) are
// unchanged. The admin-only verify/reject schemas further down are
// out of Batch 6 scope and are left exactly as they were.

// Algérie Poste CCP account numbers are commonly 6-10 digits (no leading
// zero stripping assumed — kept as a string throughout, never parsed as
// a number, since leading zeros are significant).
const ccpAccountNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/, "ccpAccountNumberInvalid");

// The "clé" / key is always exactly 2 digits.
const ccpKeySchema = z.string().trim().regex(/^\d{2}$/, "ccpKeyInvalid");

// RIP (Relevé d'Identité Postale) — CCP account number + key concatenated
// into a fixed-length identifier used for interbank/postal transfers.
// Not always required at submission time (some payout flows only need
// account number + key), so this stays optional but validated when present.
const ripSchema = z
  .string()
  .trim()
  .regex(/^\d{18,20}$/, "ripInvalid")
  .optional()
  .or(z.literal("").transform(() => undefined));

const legalFullNameSchema = z
  .string()
  .trim()
  .min(3, "legalFullNameRequired")
  .max(200);

export const ccpPayoutAccountSchema = z.object({
  method: z.literal("CCP_BARIDIMOB"),
  legalFullName: legalFullNameSchema,
  country: z.literal("DZ").default("DZ"),
  ccpAccountNumber: ccpAccountNumberSchema,
  ccpKey: ccpKeySchema,
  rip: ripSchema,
});

export type CcpPayoutAccountInput = z.infer<typeof ccpPayoutAccountSchema>;

/**
 * Discriminated union — add new branches here as new methods go live.
 * `payoutAccountInputSchema.parse(data)` is what services/actions call;
 * they never need to know which branch matched.
 */
export const payoutAccountInputSchema = z.discriminatedUnion("method", [
  ccpPayoutAccountSchema,
  // BANK_TRANSFER_INTL, WISE, PAYPAL: add branches here when those
  // methods are actually implemented. Do not add placeholder branches
  // ahead of time — an unimplemented method with a schema but no
  // service/UI support is worse than no schema at all.
]);

export type PayoutAccountInput = z.infer<typeof payoutAccountInputSchema>;

/** Builds the non-sensitive masked preview string stored in the clear. */
export function buildMaskedPreview(input: PayoutAccountInput): string {
  if (input.method === "CCP_BARIDIMOB") {
    const tail = input.ccpAccountNumber.slice(-4);
    return `CCP •••• ${tail}`;
  }
  return "•••• ••••";
}

export const verifyPayoutAccountSchema = z.object({
  payoutAccountId: z.string().min(1),
});

export const rejectPayoutAccountSchema = z.object({
  payoutAccountId: z.string().min(1),
  rejectionReason: z.string().trim().min(3, "سبب الرفض مطلوب.").max(500),
});
