"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { ForbiddenError } from "@/server/auth/rbac";
import {
  createResourceSchema,
  updateResourceSchema,
  parseKeywordsField,
} from "@/lib/validation/resource.schema";
import {
  createResource,
  updateResource,
  deleteResource,
  submitResourceForReview,
  NotFoundError,
  ValidationError,
} from "@/server/services/resource.service";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export type ResourceFormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  resourceId?: string;
};

const initialState: ResourceFormState = { success: false };

function extractMetadataFromFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    type: formData.get("type"),
    abstract: formData.get("abstract"),
    description: formData.get("description"),
    keywords: parseKeywordsField(formData.get("keywords")),
    domainId: formData.get("domainId"),
    specialtyId: formData.get("specialtyId"),
    universityId: formData.get("universityId"),
    facultyId: formData.get("facultyId"),
    level: formData.get("level"),
    year: formData.get("year"),
    language: formData.get("language"),
    authorName: formData.get("authorName"),
  };
}

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/publisher/resources");
  }
  return session;
}

// Maps the stable Zod error codes from resource.schema.ts to a
// localized display string. The codes themselves are validation logic
// (untouched, Batch 6 out-of-scope); this mapping is presentation
// only. Same convention as auth.actions.ts's localizeFieldErrors
// (Batch 4). See the Batch 6 freeze report for the full mapping.
function localizeFieldErrors(
  fieldErrors: Record<string, string[]>,
  dict: Dictionary,
): Record<string, string[]> {
  const codeToMessage: Record<string, string> = {
    invalidId: dict.publisherDashboard.errorInvalidId,
    titleTooShort: dict.publisherDashboard.errorTitleTooShort,
    titleTooLong: dict.publisherDashboard.errorTitleTooLong,
    typeRequired: dict.publisherDashboard.errorTypeRequired,
    abstractTooLong: dict.publisherDashboard.errorAbstractTooLong,
    descriptionTooLong: dict.publisherDashboard.errorDescriptionTooLong,
    keywordsTooMany: dict.publisherDashboard.errorKeywordsTooMany,
    yearMustBeInteger: dict.publisherDashboard.errorYearMustBeInteger,
    yearInvalid: dict.publisherDashboard.errorYearInvalid,
    authorNameRequired: dict.publisherDashboard.errorAuthorNameRequired,
    authorNameTooLong: dict.publisherDashboard.errorAuthorNameTooLong,
  };

  const localized: Record<string, string[]> = {};
  for (const [field, codes] of Object.entries(fieldErrors)) {
    localized[field] = codes.map((code) => codeToMessage[code] ?? code);
  }
  return localized;
}

/**
 * Maps thrown service errors to a form-friendly state instead of a hard
 * crash.
 *
 * NOTE (Batch 6): ValidationError's own `error.message` is passed
 * through unchanged here — those messages originate in
 * resource.service.ts (business-logic/service layer), which is outside
 * this batch's explicit scope (resource.actions.ts /
 * resource-upload.actions.ts only). They remain hardcoded Arabic;
 * flagged in the Batch 6 freeze report as a disclosed, deliberate
 * exception, same as Batch 4 did for loginSchema.
 */
function toFormState(error: unknown, dict: Dictionary): ResourceFormState {
  if (error instanceof ForbiddenError) {
    return { success: false, message: dict.publisherDashboard.errorForbiddenGeneric };
  }
  if (error instanceof NotFoundError) {
    return { success: false, message: dict.publisherDashboard.errorResourceNotFound };
  }
  if (error instanceof ValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[resource.actions] unexpected error:", error);
  return { success: false, message: dict.publisherDashboard.errorUnexpectedGeneric };
}

export async function createResourceAction(
  _prevState: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const session = await requireSession();
  const dict = await getDictionary(await getLocale());

  const parsed = createResourceSchema.safeParse(extractMetadataFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: localizeFieldErrors(parsed.error.flatten().fieldErrors, dict) };
  }

  try {
    const resource = await createResource(
      { id: session.user.id, role: session.user.role },
      parsed.data,
    );
    revalidatePath("/publisher/resources");
    return {
      success: true,
      message: dict.publisherDashboard.successDraftCreated,
      resourceId: resource.id,
    };
  } catch (error) {
    return toFormState(error, dict);
  }
}

export async function updateResourceAction(
  resourceId: string,
  _prevState: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const session = await requireSession();
  const dict = await getDictionary(await getLocale());

  const parsed = updateResourceSchema.safeParse(extractMetadataFromFormData(formData));
  if (!parsed.success) {
    return { success: false, errors: localizeFieldErrors(parsed.error.flatten().fieldErrors, dict) };
  }

  try {
    await updateResource({ id: session.user.id, role: session.user.role }, resourceId, parsed.data);
    revalidatePath("/publisher/resources");
    revalidatePath(`/publisher/resources/${resourceId}`);
    return { success: true, message: dict.publisherDashboard.successChangesSaved };
  } catch (error) {
    return toFormState(error, dict);
  }
}

export async function submitResourceAction(resourceId: string): Promise<ResourceFormState> {
  const session = await requireSession();
  const dict = await getDictionary(await getLocale());

  try {
    await submitResourceForReview({ id: session.user.id, role: session.user.role }, resourceId);
    revalidatePath("/publisher/resources");
    revalidatePath(`/publisher/resources/${resourceId}`);
    return { success: true, message: dict.publisherDashboard.successSubmittedForReview };
  } catch (error) {
    return toFormState(error, dict);
  }
}

export async function deleteResourceAction(resourceId: string): Promise<ResourceFormState> {
  const session = await requireSession();
  const dict = await getDictionary(await getLocale());

  try {
    await deleteResource({ id: session.user.id, role: session.user.role }, resourceId);
    revalidatePath("/publisher/resources");
    return { success: true, message: dict.publisherDashboard.successDraftDeleted };
  } catch (error) {
    return toFormState(error, dict);
  }
}
