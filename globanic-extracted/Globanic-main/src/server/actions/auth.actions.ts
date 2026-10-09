"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/server/auth/password";
import { registerSchema } from "@/lib/validation/auth.schema";
import { signOut } from "@/server/auth/auth";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export type RegisterFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

// Maps the stable Zod error codes from auth.schema.ts's registerSchema
// to a localized display string. The codes themselves are validation
// logic (untouched, Batch 4 out-of-scope); this mapping is presentation
// only. See the Batch 4 freeze report, section D.
function localizeFieldErrors(
  fieldErrors: Record<string, string[]>,
  dict: Dictionary,
): Record<string, string[]> {
  const codeToMessage: Record<string, string> = {
    fullNameTooShort: dict.auth.errorFullNameTooShort,
    fullNameTooLong: dict.auth.errorFullNameTooLong,
    emailInvalid: dict.auth.errorEmailInvalid,
    passwordTooShort: dict.auth.errorPasswordTooShort,
    passwordNeedsUppercase: dict.auth.errorPasswordNeedsUppercase,
    passwordNeedsLowercase: dict.auth.errorPasswordNeedsLowercase,
    passwordNeedsNumber: dict.auth.errorPasswordNeedsNumber,
  };

  const localized: Record<string, string[]> = {};
  for (const [field, codes] of Object.entries(fieldErrors)) {
    localized[field] = codes.map((code) => codeToMessage[code] ?? code);
  }
  return localized;
}

/**
 * Registers a new USER account. Never assigns PUBLISHER/ADMIN roles here —
 * elevated roles are only ever granted through the publisher verification
 * workflow (phase 6) or by an existing ADMIN (phase 9), never at signup.
 */
export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const dict = await getDictionary(await getLocale());

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      errors: localizeFieldErrors(parsed.error.flatten().fieldErrors, dict),
    };
  }

  const { fullName, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return {
      success: false,
      errors: { email: [dict.auth.emailAlreadyRegisteredError] },
    };
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      profile: {
        create: { fullName },
      },
    },
  });

  return { success: true, message: dict.auth.registerSuccessMessage };
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
