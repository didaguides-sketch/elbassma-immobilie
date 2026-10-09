"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { ForbiddenError } from "@/server/auth/rbac";
import { domainInputSchema } from "@/lib/validation/domain.schema";
import { createDomain, updateDomain, deleteDomain } from "@/server/services/domain-admin.service";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export type DomainFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  domainId?: string;
};

function extractFromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    icon: formData.get("icon"),
    order: formData.get("order"),
  };
}

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/domains");
  }
  return session;
}

// Maps the stable Zod error codes from domain.schema.ts to a localized
// display string. Same convention as resource.actions.ts's
// localizeFieldErrors (Batch 6).
function localizeFieldErrors(
  fieldErrors: Record<string, string[]>,
  dict: Dictionary,
): Record<string, string[]> {
  const codeToMessage: Record<string, string> = {
    domainNameTooShort: dict.adminDashboard.errorDomainNameTooShort,
    domainNameTooLong: dict.adminDashboard.errorDomainNameTooLong,
    domainIconTooLong: dict.adminDashboard.errorDomainIconTooLong,
    domainOrderMustBeInteger: dict.adminDashboard.errorDomainOrderMustBeInteger,
    domainOrderMustBePositive: dict.adminDashboard.errorDomainOrderMustBePositive,
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
 * domain-admin.service.ts (business-logic/service layer), outside
 * this batch's explicit action-file scope. Same disclosed exception
 * pattern as Batch 6.
 */
function toFormState(error: unknown, dict: Dictionary): DomainFormState {
  if (error instanceof ForbiddenError) {
    return { success: false, message: dict.adminDashboard.errorUnauthorizedGeneric };
  }
  if (error instanceof NotFoundError) {
    return { success: false, message: dict.adminDashboard.errorDomainNotFound };
  }
  if (error instanceof ValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[admin-domain.actions] unexpected error:", error);
  return { success: false, message: dict.adminDashboard.errorUnexpectedRetry };
}

export async function createDomainAction(
  _prevState: DomainFormState,
  formData: FormData,
): Promise<DomainFormState> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());

  const parsed = domainInputSchema.safeParse(extractFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: localizeFieldErrors(parsed.error.flatten().fieldErrors, dict) };
  }

  try {
    const domain = await createDomain({ id: session.user.id, role: session.user.role }, parsed.data);
    revalidatePath("/admin/domains");
    return { success: true, message: dict.adminDashboard.successDomainCreated, domainId: domain.id };
  } catch (error) {
    return toFormState(error, dict);
  }
}

export async function updateDomainAction(
  domainId: string,
  _prevState: DomainFormState,
  formData: FormData,
): Promise<DomainFormState> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());

  const parsed = domainInputSchema.safeParse(extractFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: localizeFieldErrors(parsed.error.flatten().fieldErrors, dict) };
  }

  try {
    await updateDomain({ id: session.user.id, role: session.user.role }, domainId, parsed.data);
    revalidatePath("/admin/domains");
    revalidatePath(`/admin/domains/${domainId}`);
    return { success: true, message: dict.adminDashboard.successChangesSaved };
  } catch (error) {
    return toFormState(error, dict);
  }
}

export async function deleteDomainAction(
  domainId: string,
): Promise<{ success: boolean; message?: string }> {
  const session = await requireAdminSession();
  const dict = await getDictionary(await getLocale());

  try {
    await deleteDomain({ id: session.user.id, role: session.user.role }, domainId);
    revalidatePath("/admin/domains");
    return { success: true, message: dict.adminDashboard.successDomainDeleted };
  } catch (error) {
    return toFormState(error, dict);
  }
}
