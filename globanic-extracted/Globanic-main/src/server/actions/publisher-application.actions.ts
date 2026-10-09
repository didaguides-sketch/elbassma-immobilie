"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { ForbiddenError } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "@/server/services/resource.service";
import { StorageValidationError } from "@/server/storage";
import { publisherApplicationSchema } from "@/lib/validation/publisher-application.schema";
import {
  submitPublisherApplication,
  verifyPublisherApplication,
  rejectPublisherApplication,
  suspendPublisher,
} from "@/server/services/publisher-application.service";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export type ApplicationFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export type AdminApplicationActionResult = { success: boolean; message?: string };

async function requireSession(callbackUrl: string) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return session;
}

function toFormState(error: unknown, dict: Dictionary): ApplicationFormState {
  if (error instanceof ForbiddenError) return { success: false, message: dict.adminDashboard.errorUnauthorizedShort };
  if (error instanceof NotFoundError) return { success: false, message: dict.adminDashboard.errorApplicationNotFound };
  if (error instanceof ValidationError || error instanceof StorageValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[publisher-application.actions] unexpected error:", error);
  return { success: false, message: dict.adminDashboard.errorUnexpectedNoRetry };
}

function toAdminResult(error: unknown, dict: Dictionary): AdminApplicationActionResult {
  const state = toFormState(error, dict);
  return { success: state.success, message: state.message };
}

// Maps the stable Zod error codes from publisher-application.schema.ts
// to a localized display string. Same convention as
// resource.actions.ts's localizeFieldErrors (Batch 6).
function localizeFieldErrors(
  fieldErrors: Record<string, string[]>,
  dict: Dictionary,
): Record<string, string[]> {
  const codeToMessage: Record<string, string> = {
    invalidId: dict.publisherDashboard.errorInvalidId,
    appFullNameTooShort: dict.publisherDashboard.errorAppFullNameTooShort,
    appFullNameTooLong: dict.publisherDashboard.errorAppFullNameTooLong,
    academicStatusRequired: dict.publisherDashboard.errorAcademicStatusRequired,
    academicStatusTooLong: dict.publisherDashboard.errorAcademicStatusTooLong,
    academicEmailInvalid: dict.publisherDashboard.errorAcademicEmailInvalid,
    additionalInfoTooLong: dict.publisherDashboard.errorAdditionalInfoTooLong,
  };

  const localized: Record<string, string[]> = {};
  for (const [field, codes] of Object.entries(fieldErrors)) {
    localized[field] = codes.map((code) => codeToMessage[code] ?? code);
  }
  return localized;
}

/**
 * NOTE (Batch 6): used only by the publisher-facing submit action
 * below — deliberately separate from the unmodified `toFormState`
 * above (still used by the admin actions via `toAdminResult`), so that
 * localizing the publisher submit flow has zero effect on
 * AdminPublisherApplicationActions.tsx, which is explicitly out of
 * Batch 6 scope. ValidationError/StorageValidationError's own
 * `error.message` is passed through unchanged, same disclosed
 * exception as the other Batch 6 action files (message originates in
 * the service layer, outside this batch's scope).
 */
function toLocalizedFormState(error: unknown, dict: Dictionary): ApplicationFormState {
  if (error instanceof ForbiddenError) {
    return { success: false, message: dict.publisherDashboard.errorForbiddenApplication };
  }
  if (error instanceof NotFoundError) {
    return { success: false, message: dict.publisherDashboard.errorApplicationNotFound };
  }
  if (error instanceof ValidationError || error instanceof StorageValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[publisher-application.actions] unexpected error:", error);
  return { success: false, message: dict.publisherDashboard.errorUnexpectedApplication };
}

export async function submitPublisherApplicationAction(
  _prevState: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const session = await requireSession("/publisher/apply");
  const dict = await getDictionary(await getLocale());

  const parsed = publisherApplicationSchema.safeParse({
    fullName: formData.get("fullName"),
    universityId: formData.get("universityId"),
    academicStatus: formData.get("academicStatus"),
    specialtyId: formData.get("specialtyId"),
    academicEmail: formData.get("academicEmail"),
    additionalInfo: formData.get("additionalInfo"),
  });

  if (!parsed.success) {
    return { success: false, errors: localizeFieldErrors(parsed.error.flatten().fieldErrors, dict) };
  }

  const proofFile = formData.get("proofFile");
  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return { success: false, message: dict.publisherDashboard.errorAttachProofFile };
  }

  try {
    await submitPublisherApplication(
      { id: session.user.id, role: session.user.role },
      parsed.data,
      proofFile,
    );
    revalidatePath("/publisher/apply");
    return { success: true, message: dict.publisherDashboard.successApplicationSubmitted };
  } catch (error) {
    return toLocalizedFormState(error, dict);
  }
}

export async function verifyPublisherApplicationAction(
  applicationId: string,
): Promise<AdminApplicationActionResult> {
  const session = await requireSession("/admin/publisher-applications");
  const dict = await getDictionary(await getLocale());
  try {
    await verifyPublisherApplication({ id: session.user.id, role: session.user.role }, applicationId);
    revalidatePath("/admin/publisher-applications");
    return { success: true, message: dict.adminDashboard.successPublisherVerified };
  } catch (error) {
    return toAdminResult(error, dict);
  }
}

export async function rejectPublisherApplicationAction(
  applicationId: string,
  reason: string,
): Promise<AdminApplicationActionResult> {
  const session = await requireSession("/admin/publisher-applications");
  const dict = await getDictionary(await getLocale());
  try {
    await rejectPublisherApplication(
      { id: session.user.id, role: session.user.role },
      applicationId,
      reason,
    );
    revalidatePath("/admin/publisher-applications");
    return { success: true, message: dict.adminDashboard.successApplicationRejected };
  } catch (error) {
    return toAdminResult(error, dict);
  }
}

export async function suspendPublisherAction(
  targetUserId: string,
  reason?: string,
): Promise<AdminApplicationActionResult> {
  const session = await requireSession("/admin/publisher-applications");
  const dict = await getDictionary(await getLocale());
  try {
    await suspendPublisher({ id: session.user.id, role: session.user.role }, targetUserId, reason);
    revalidatePath("/admin/publisher-applications");
    return { success: true, message: dict.adminDashboard.successPublisherSuspended };
  } catch (error) {
    return toAdminResult(error, dict);
  }
}
