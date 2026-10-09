import { z } from "zod";
import { ResourceType } from "@prisma/client";

const currentYear = new Date().getFullYear();

// NOTE (Phase 16B, Batch 6): the second argument to each Zod rule below
// is now a stable, machine-readable error CODE, not a displayed string.
// The validation rules themselves (min/max lengths, regex patterns) are
// byte-for-byte unchanged from before this batch — only what used to be
// a hardcoded Arabic message is now a code that the presentation layer
// (resource.actions.ts) maps to a localized string via the i18n
// dictionary. This preserves existing validation behavior exactly, and
// follows the same convention established in auth.schema.ts (Batch 4);
// see the Batch 6 freeze report for the full code -> dictionary key
// mapping.

// cuid()s are what Prisma generates by default for every id in schema.prisma
const idSchema = z.string().cuid("invalidId");

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const resourceMetadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "titleTooShort")
    .max(300, "titleTooLong"),

  type: z.nativeEnum(ResourceType, {
    errorMap: () => ({ message: "typeRequired" }),
  }),

  abstract: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(600, "abstractTooLong").optional(),
  ),

  description: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(5000, "descriptionTooLong").optional(),
  ),

  keywords: z
    .array(z.string().trim().min(2).max(40))
    .max(15, "keywordsTooMany")
    .default([]),

  domainId: idSchema,
  specialtyId: z.preprocess(emptyToUndefined, idSchema.optional()),
  universityId: z.preprocess(emptyToUndefined, idSchema.optional()),
  facultyId: z.preprocess(emptyToUndefined, idSchema.optional()),

  level: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),

  year: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int("yearMustBeInteger")
      .min(1950, "yearInvalid")
      .max(currentYear + 1, "yearInvalid")
      .optional(),
  ),

  language: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(2).max(30).optional(),
  ),

  // Freeform for now: the full Author directory/search UI is Phase 13.
  // The service layer finds-or-creates an Author by this name.
  authorName: z
    .string()
    .trim()
    .min(2, "authorNameRequired")
    .max(150, "authorNameTooLong"),
});

export type ResourceMetadataInput = z.infer<typeof resourceMetadataSchema>;

export const createResourceSchema = resourceMetadataSchema;

export const updateResourceSchema = resourceMetadataSchema.partial().extend({
  // Title stays required even on update — an empty title should never be
  // persisted, so we don't relax it via .partial().
  title: resourceMetadataSchema.shape.title,
});

export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

export const resourceIdSchema = z.object({
  resourceId: idSchema,
});

/** Parses a comma-separated keywords string coming from a single text input. */
export function parseKeywordsField(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 15);
}
