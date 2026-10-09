"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/server/auth/password";
import { registerSchema } from "@/lib/validation/auth.schema";
import { signOut } from "@/server/auth/auth.config";

export type RegisterFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

/**
 * Registers a new USER account. Never assigns PUBLISHER/ADMIN roles here —
 * elevated roles are only ever granted through the publisher verification
 * workflow (phase 6) or by an existing ADMIN (phase 9), never at signup.
 */
export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { fullName, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return {
      success: false,
      errors: { email: ["يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل."] },
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

  return { success: true, message: "تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن." };
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
