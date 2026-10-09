import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

// Slug is deliberately NOT part of this schema — per the approved Phase 16
// plan, it is generated server-side from `name` on creation only, and is
// never accepted from the client or regenerated on a later name edit.
export const universityInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "اسم الجامعة قصير جدًا (حرفان على الأقل)")
    .max(200, "اسم الجامعة طويل جدًا (200 حرف كحد أقصى)"),

  city: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(100, "اسم المدينة طويل جدًا").optional(),
  ),

  country: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(100, "اسم الدولة طويل جدًا").optional(),
  ),

  logoUrl: z.preprocess(
    emptyToUndefined,
    z.string().trim().url("رابط الشعار غير صالح").max(500, "الرابط طويل جدًا").optional(),
  ),

  officialWebsite: z.preprocess(
    emptyToUndefined,
    z.string().trim().url("رابط الموقع غير صالح").max(500, "الرابط طويل جدًا").optional(),
  ),
});

export type UniversityInput = z.infer<typeof universityInputSchema>;
