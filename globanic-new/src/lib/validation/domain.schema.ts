import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

// Slug is deliberately NOT part of this schema — same reasoning as
// university.schema.ts: generated server-side from `name` on creation
// only, frozen thereafter.
export const domainInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "اسم المجال قصير جدًا (حرفان على الأقل)")
    .max(100, "اسم المجال طويل جدًا (100 حرف كحد أقصى)"),

  icon: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(50, "الأيقونة طويلة جدًا").optional(),
  ),

  order: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int("الترتيب يجب أن يكون رقمًا صحيحًا")
      .min(0, "الترتيب يجب أن يكون رقمًا موجبًا")
      .optional(),
  ),
});

export type DomainInput = z.infer<typeof domainInputSchema>;
