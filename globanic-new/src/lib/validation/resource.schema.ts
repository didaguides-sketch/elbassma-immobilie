import { z } from "zod";
import { ResourceType } from "@prisma/client";

const currentYear = new Date().getFullYear();

// cuid()s are what Prisma generates by default for every id in schema.prisma
const idSchema = z.string().cuid("معرّف غير صالح");

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const resourceMetadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "العنوان قصير جدًا (5 أحرف على الأقل)")
    .max(300, "العنوان طويل جدًا (300 حرف كحد أقصى)"),

  type: z.nativeEnum(ResourceType, {
    errorMap: () => ({ message: "نوع المورد مطلوب" }),
  }),

  abstract: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(600, "الملخص طويل جدًا (600 حرف كحد أقصى)").optional(),
  ),

  description: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(5000, "الوصف طويل جدًا (5000 حرف كحد أقصى)").optional(),
  ),

  keywords: z
    .array(z.string().trim().min(2).max(40))
    .max(15, "15 كلمة مفتاحية كحد أقصى")
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
      .int("السنة يجب أن تكون رقمًا صحيحًا")
      .min(1950, "سنة غير صالحة")
      .max(currentYear + 1, "سنة غير صالحة")
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
    .min(2, "اسم المؤلف مطلوب")
    .max(150, "اسم المؤلف طويل جدًا"),
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
