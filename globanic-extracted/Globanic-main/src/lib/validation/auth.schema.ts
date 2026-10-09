import { z } from "zod";

// NOTE (Phase 16B, Batch 4): the second argument to each Zod rule below
// is now a stable, machine-readable error CODE, not a displayed string.
// The validation rules themselves (min/max lengths, regex patterns) are
// byte-for-byte unchanged from before this batch — only what used to be
// a hardcoded Arabic message is now a code that the presentation layer
// (auth.actions.ts) maps to a localized string via the i18n dictionary.
// This preserves existing validation behavior exactly; see the Batch 4
// freeze report, section D, for the full code -> dictionary key mapping.
export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "fullNameTooShort")
    .max(100, "fullNameTooLong"),
  email: z.string().trim().toLowerCase().email("emailInvalid"),
  password: z
    .string()
    .min(8, "passwordTooShort")
    .regex(/[A-Z]/, "passwordNeedsUppercase")
    .regex(/[a-z]/, "passwordNeedsLowercase")
    .regex(/[0-9]/, "passwordNeedsNumber"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// loginSchema's messages are intentionally left as the original Arabic
// literals: LoginForm.tsx never surfaces per-field Zod messages to the
// user (it only checks parsed.success and shows one generic localized
// message on failure — see LoginForm.tsx), so these strings are dead
// code from a display standpoint and out of Batch 4's UI-migration
// scope. Left unchanged to keep this a minimal, low-risk edit.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type LoginInput = z.infer<typeof loginSchema>;
