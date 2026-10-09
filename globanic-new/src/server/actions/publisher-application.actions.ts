"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
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

function toFormState(error: unknown): ApplicationFormState {
  if (error instanceof ForbiddenError) return { success: false, message: "غير مصرح لك بهذا الإجراء." };
  if (error instanceof NotFoundError) return { success: false, message: "الطلب غير موجود." };
  if (error instanceof ValidationError || error instanceof StorageValidationError) {
    return { success: false, message: error.message };
  }
  // eslint-disable-next-line no-console
  console.error("[publisher-application.actions] unexpected error:", error);
  return { success: false, message: "حدث خطأ غير متوقع." };
}

function toAdminResult(error: unknown): AdminApplicationActionResult {
  const state = toFormState(error);
  return { success: state.success, message: state.message };
}

export async function submitPublisherApplicationAction(
  _prevState: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const session = await requireSession("/publisher/apply");

  const parsed = publisherApplicationSchema.safeParse({
    fullName: formData.get("fullName"),
    universityId: formData.get("universityId"),
    academicStatus: formData.get("academicStatus"),
    specialtyId: formData.get("specialtyId"),
    academicEmail: formData.get("academicEmail"),
    additionalInfo: formData.get("additionalInfo"),
  });

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const proofFile = formData.get("proofFile");
  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return { success: false, message: "الرجاء إرفاق مستند إثبات." };
  }

  try {
    await submitPublisherApplication(
      { id: session.user.id, role: session.user.role },
      parsed.data,
      proofFile,
    );
    revalidatePath("/publisher/apply");
    return { success: true, message: "تم إرسال طلبك بنجاح. سيتم مراجعته من طرف الإدارة." };
  } catch (error) {
    return toFormState(error);
  }
}

export async function verifyPublisherApplicationAction(
  applicationId: string,
): Promise<AdminApplicationActionResult> {
  const session = await requireSession("/admin/publisher-applications");
  try {
    await verifyPublisherApplication({ id: session.user.id, role: session.user.role }, applicationId);
    revalidatePath("/admin/publisher-applications");
    return { success: true, message: "تم التحقق من الناشر." };
  } catch (error) {
    return toAdminResult(error);
  }
}

export async function rejectPublisherApplicationAction(
  applicationId: string,
  reason: string,
): Promise<AdminApplicationActionResult> {
  const session = await requireSession("/admin/publisher-applications");
  try {
    await rejectPublisherApplication(
      { id: session.user.id, role: session.user.role },
      applicationId,
      reason,
    );
    revalidatePath("/admin/publisher-applications");
    return { success: true, message: "تم رفض الطلب." };
  } catch (error) {
    return toAdminResult(error);
  }
}

export async function suspendPublisherAction(
  targetUserId: string,
  reason?: string,
): Promise<AdminApplicationActionResult> {
  const session = await requireSession("/admin/publisher-applications");
  try {
    await suspendPublisher({ id: session.user.id, role: session.user.role }, targetUserId, reason);
    revalidatePath("/admin/publisher-applications");
    return { success: true, message: "تم تعليق صلاحيات الناشر." };
  } catch (error) {
    return toAdminResult(error);
  }
}
