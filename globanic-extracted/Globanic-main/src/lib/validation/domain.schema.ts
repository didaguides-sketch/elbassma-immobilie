import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

// Slug is deliberately NOT part of this schema — same reasoning as
// university.schema.ts: generated server-side from `name` on creation
// only, frozen thereafter.
//
// NOTE (Phase 16B, Batch 7A): the second argument to each rule below is
// now a stable, machine-readable error CODE, not a displayed string —
// same convention as auth.schema.ts (Batch 4), resource.schema.ts and
// publisher-application.schema.ts (Batch 6). Validation rules
// (min/max lengths) are byte-for-byte unchanged; only presentation
// moved to admin-domain.actions.ts + the i18n dictionary
// (adminDashboard namespace).
export const domainInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "domainNameTooShort")
    .max(100, "domainNameTooLong"),

  icon: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(50, "domainIconTooLong").optional(),
  ),

  order: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int("domainOrderMustBeInteger")
      .min(0, "domainOrderMustBePositive")
      .optional(),
  ),
});

export type DomainInput = z.infer<typeof domainInputSchema>;
