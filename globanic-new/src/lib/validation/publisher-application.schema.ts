import { z } from "zod";

const idSchema = z.string().cuid("معرّف غير صالح");
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const publisherApplicationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "الاسم الكامل قصير جدًا")
    .max(150, "الاسم الكامل طويل جدًا"),

  universityId: z.preprocess(emptyToUndefined, idSchema.optional()),

  academicStatus: z
    .string()
    .trim()
    .min(2, "الصفة الأكاديمية مطلوبة")
    .max(100, "الصفة الأكاديمية طويلة جدًا"),

  specialtyId: z.preprocess(emptyToUndefined, idSchema.optional()),

  academicEmail: z.string().trim().toLowerCase().email("البريد الإلكتروني الأكاديمي غير صالح"),

  additionalInfo: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000, "المعلومات الإضافية طويلة جدًا").optional(),
  ),
});

export type PublisherApplicationInput = z.infer<typeof publisherApplicationSchema>;
