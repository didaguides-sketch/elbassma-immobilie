import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

// Slug is deliberately NOT part of this schema — per the approved Phase 16
// plan, it is generated server-side from `name` on creation only, and is
// never accepted from the client or regenerated on a later name edit.
//
// NOTE (Phase 16B, Batch 7A): stable error CODES, not display strings —
// same convention as domain.schema.ts (Batch 7A) / resource.schema.ts
// (Batch 6). Validation rules unchanged; only presentation moved to
// admin-university.actions.ts + the i18n dictionary.
export const universityInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "universityNameTooShort")
    .max(200, "universityNameTooLong"),

  city: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(100, "cityTooLong").optional(),
  ),

  country: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(100, "countryTooLong").optional(),
  ),

  logoUrl: z.preprocess(
    emptyToUndefined,
    z.string().trim().url("logoUrlInvalid").max(500, "urlTooLong").optional(),
  ),

  officialWebsite: z.preprocess(
    emptyToUndefined,
    z.string().trim().url("websiteUrlInvalid").max(500, "urlTooLong").optional(),
  ),
});

export type UniversityInput = z.infer<typeof universityInputSchema>;
