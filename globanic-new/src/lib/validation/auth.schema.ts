import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "الاسم الكامل يجب أن يحتوي على حرفين على الأقل")
    .max(100, "الاسم طويل جدًا"),
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صالح"),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل")
    .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير واحد على الأقل")
    .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير واحد على الأقل")
    .regex(/[0-9]/, "يجب أن تحتوي على رقم واحد على الأقل"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type LoginInput = z.infer<typeof loginSchema>;
