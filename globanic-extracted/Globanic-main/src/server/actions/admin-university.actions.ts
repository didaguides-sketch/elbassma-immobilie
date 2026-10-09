"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { ForbiddenError } from "@/server/auth/rbac";
import { universityInputSchema } from "@/lib/validation/university.schema";
import {
  createUniversity,
  updateUniversity,
  deleteUniversity,
} from "@/server/services/university-admin.service";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export type UniversityFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  universityId?: string;
};

function extractFromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    city: formData.get("city"),
    country: formData.get("country"),
    logoUrl: formData.get("logoUrl"),
    officialWebsite: formData.get("officialWebsite"),
  };
}

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/universities");
  }
  return session;
}

// Maps the stable Zod error codes from university.schema.ts to a
// localized display string. Same convention as
// admin-domain.actions.ts's localizeFieldErrors (Batch 7A).
function localizeFieldErrors(
  fieldErrors: Record<string, string[]>,
  dict: Dictionary,
): Record<string, string[]> {
  const codeToMessage: Record<string, string> = {
    universityNameTooShort: dict.adminDashboard.errorUniversityNameTooShort,
    universityNameTooLong: dict.adminDashboard.errorUniversityNameTooLong,
    cityTooLong: dict.adminDashboard.errorCityTooLong,
    countryTooLong: dict.adminDashboard.errorCountryTooLong,
    logoUrlInvalid: dict.adminDashboard.errorLogoUrlInvalid,
    websiteUrlInvalid: dict.adminDashboard.errorWebsiteUrlInvalid,
    urlTooLong: dict.adminDashboard.errorUrlTooLong,
  };

  const localized: Record<string, string[]> = {};
  for (const [field, codes] of Object.entries(fieldErrors)) {
    localized[field] = codes.map((code) => codeToMessage[code] ?? code);
  }
  return localized;
}

/**
 * NOTE (Batch 7A): ValidationError's own `error.message` is passed
 * through unchanged here — those messages originate in
 * university-admin.service.ts (business-logic/service layer), outside
 * this batch's explicit action-file scope. Same disclosed exception
 * pattern as Batch 6.
 */
function toFormState(error: unknown, dict: Dictionary): UniversityFormState {
  if (error instanceof ForbiddenError) {
    return { success: false, message: dict.adminDashboard.errorUnauthorizedGeneric };
  }
  if (error instanceof NotFoundError) {
    return { success: false, message: dict.adminDashboard.errorUniversityNotFound };
  }
  if (error instanceof ValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[admin-university.actions] unexpected error:", error);
  return { success: false, message: dict.adminDashboard.errorUnexpectedRetry };
}

export async function createUniversityAction(
  _prevState: UniversityFormState,
  formData: FormData,
): Promise<UniversityFormState> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());

  const parsed = universityInputSchema.safeParse(extractFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: localizeFieldErrors(parsed.error.flatten().fieldErrors, dict) };
  }

  try {
    const university = await createUniversity(
      { id: session.user.id, role: session.user.role },
      parsed.data,
    );
    revalidatePath("/admin/universities");
    return { success: true, message: dict.adminDashboard.successUniversityCreated, universityId: university.id };
  } catch (error) {
    return toFormState(error, dict);
  }
}

export async function updateUniversityAction(
  universityId: string,
  _prevState: UniversityFormState,
  formData: FormData,
): Promise<UniversityFormState> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());

  const parsed = universityInputSchema.safeParse(extractFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: localizeFieldErrors(parsed.error.flatten().fieldErrors, dict) };
  }

  try {
    await updateUniversity({ id: session.user.id, role: session.user.role }, universityId, parsed.data);
    revalidatePath("/admin/universities");
    revalidatePath(`/admin/universities/${universityId}`);
    return { success: true, message: dict.adminDashboard.successChangesSaved };
  } catch (error) {
    return toFormState(error, dict);
  }
}

export async function deleteUniversityAction(
  universityId: string,
): Promise<{ success: boolean; message?: string }> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());

  try {
    await deleteUniversity({ id: session.user.id, role: session.user.role }, universityId);
    revalidatePath("/admin/universities");
    return { success: true, message: dict.adminDashboard.successUniversityDeleted };
  } catch (error) {
    return toFormState(error, dict);
  }
}
