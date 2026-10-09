import { z } from "zod";

// NOTE (Phase 16B, Batch 6): stable error CODES, not display strings —
// same convention as auth.schema.ts (Batch 4) and resource.schema.ts
// (Batch 6). Validation rules unchanged; only presentation moved to
// publisher-application.actions.ts + the i18n dictionary.
const idSchema = z.string().cuid("invalidId");
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const publisherApplicationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "appFullNameTooShort")
    .max(150, "appFullNameTooLong"),

  universityId: z.preprocess(emptyToUndefined, idSchema.optional()),

  academicStatus: z
    .string()
    .trim()
    .min(2, "academicStatusRequired")
    .max(100, "academicStatusTooLong"),

  specialtyId: z.preprocess(emptyToUndefined, idSchema.optional()),

  academicEmail: z.string().trim().toLowerCase().email("academicEmailInvalid"),

  additionalInfo: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000, "additionalInfoTooLong").optional(),
  ),
});

export type PublisherApplicationInput = z.infer<typeof publisherApplicationSchema>;
