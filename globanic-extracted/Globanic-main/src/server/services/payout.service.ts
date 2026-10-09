import { prisma } from "@/lib/prisma";
import { can, requireRole, ForbiddenError, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "./resource.service";

type Actor = { id: string; role: Role };

// ------------------------------------------------------------
// STATE MACHINE
// ------------------------------------------------------------
//   PENDING -> APPROVED -> PAID
//   PENDING -> FAILED
//   APPROVED -> FAILED
// No other transition is valid — in particular PAID is always terminal
// (a paid payout can never be edited or reopened) and FAILED is always
// terminal (no automatic retry path; a new payout would need a new
// revenue period or manual admin intervention outside this system).
// Enforced here, not left to the caller, so there is exactly one place
// that can move a payout's status.

export async function approvePayout(actor: Actor, payoutId: string) {
  if (!can(actor.role, "payout:manage")) throw new ForbiddenError();

  const payout = await prisma.publisherPayout.findUnique({
    where: { id: payoutId },
    include: { payoutAccount: true },
  });
  if (!payout) throw new NotFoundError();
  if (payout.status !== "PENDING") {
    throw new ValidationError(`لا يمكن اعتماد دفعة في حالة "${payout.status}" — يجب أن تكون قيد الانتظار (PENDING).`);
  }
  if (!payout.payoutAccount || !payout.payoutAccount.isActive || payout.payoutAccount.verificationStatus !== "VERIFIED") {
    throw new ValidationError(
      "لا يمكن اعتماد هذه الدفعة: الناشر ليس لديه حساب دفع موثّق ونشط. يجب أن يُقدّم الناشر معلومات الدفع أولًا وأن يوثّقها المشرف.",
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.publisherPayout.update({
      where: { id: payoutId },
      data: {
        status: "APPROVED",
        approvedById: actor.id,
        approvedAt: new Date(),
        payoutMethod: payout.payoutAccount.method,
      },
    }),
    prisma.moderationLog.create({
      data: {
        actorId: actor.id,
        payoutId,
        action: "APPROVE_PAYOUT",
        metadata: { amountCents: payout.amountCents, currency: payout.currency, publisherUserId: payout.publisherUserId },
      },
    }),
  ]);

  return updated;
}

export async function markPayoutPaid(
  actor: Actor,
  payoutId: string,
  input: { transactionReference: string; paidAt?: Date },
) {
  if (!can(actor.role, "payout:manage")) throw new ForbiddenError();

  const reference = input.transactionReference.trim();
  if (reference.length < 3) {
    throw new ValidationError("رقم مرجع العملية مطلوب لتأكيد الدفع.");
  }

  const payout = await prisma.publisherPayout.findUnique({ where: { id: payoutId } });
  if (!payout) throw new NotFoundError();
  if (payout.status !== "APPROVED") {
    throw new ValidationError(`لا يمكن تعليم دفعة كمدفوعة إلا من حالة "معتمدة" (APPROVED). الحالة الحالية: ${payout.status}.`);
  }

  const paidAt = input.paidAt ?? new Date();

  const [updated] = await prisma.$transaction([
    prisma.publisherPayout.update({
      where: { id: payoutId },
      data: { status: "PAID", transactionReference: reference, paidAt },
    }),
    prisma.moderationLog.create({
      data: {
        actorId: actor.id,
        payoutId,
        action: "MARK_PAYOUT_PAID",
        metadata: { amountCents: payout.amountCents, currency: payout.currency, transactionReference: reference },
      },
    }),
  ]);

  return updated;
}

export async function markPayoutFailed(actor: Actor, payoutId: string, failureReason: string) {
  if (!can(actor.role, "payout:manage")) throw new ForbiddenError();

  const reason = failureReason.trim();
  if (reason.length < 3) {
    throw new ValidationError("سبب الفشل مطلوب.");
  }

  const payout = await prisma.publisherPayout.findUnique({ where: { id: payoutId } });
  if (!payout) throw new NotFoundError();
  // Both PENDING (e.g. determined invalid/uncollectable before ever
  // being approved) and APPROVED (e.g. the CCP transfer itself bounced)
  // may fail. PAID and already-FAILED cannot — both are terminal states,
  // and this is the one check standing between "payout ledger" and
  // "payout ledger that can be silently rewritten."
  if (payout.status !== "PENDING" && payout.status !== "APPROVED") {
    throw new ValidationError(
      `لا يمكن تعليم دفعة كفاشلة إلا من حالة "قيد الانتظار" أو "معتمدة". الحالة الحالية: ${payout.status}.`,
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.publisherPayout.update({
      where: { id: payoutId },
      data: { status: "FAILED", failureReason: reason, failedAt: new Date() },
    }),
    prisma.moderationLog.create({
      data: {
        actorId: actor.id,
        payoutId,
        action: "MARK_PAYOUT_FAILED",
        reason,
        metadata: { amountCents: payout.amountCents, currency: payout.currency },
      },
    }),
  ]);

  return updated;
}

// ------------------------------------------------------------
// READS
// ------------------------------------------------------------

export async function listPayoutsForAdmin(actor: Actor, filter?: { status?: string }) {
  if (!can(actor.role, "payout:view")) throw new ForbiddenError();
  return prisma.publisherPayout.findMany({
    where: filter?.status ? { status: filter.status as never } : undefined,
    include: {
      publisher: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      // `isActive` added (Phase 14): the admin payouts UI needs to tell
      // "blocked because unverified" apart from "blocked because this
      // specific account was since deactivated" (e.g. the publisher
      // replaced that method) — approvePayout itself already checks
      // both conditions; this just lets the UI show the same blocked
      // state before an admin clicks Approve and hits a server error.
      payoutAccount: { select: { id: true, method: true, maskedPreview: true, verificationStatus: true, isActive: true } },
      revenuePeriod: { select: { id: true, label: true, periodStart: true, periodEnd: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Publishers with a PENDING or APPROVED payout — the admin's "awaiting payment" queue. */
export async function listPublishersAwaitingPayment(actor: Actor) {
  if (!can(actor.role, "payout:view")) throw new ForbiddenError();
  return prisma.publisherPayout.findMany({
    where: { status: { in: ["PENDING", "APPROVED"] } },
    include: {
      publisher: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      payoutAccount: { select: { id: true, method: true, maskedPreview: true, verificationStatus: true, isActive: true } },
      revenuePeriod: { select: { id: true, label: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
}

export type PublisherEarningsSummary = {
  totalPaidCents: number;
  totalPendingCents: number;
  currency: string;
  payouts: Array<{
    id: string;
    periodLabel: string;
    periodStatus: string;
    periodStart: Date;
    periodEnd: Date;
    eligibleViews: number;
    sharePercentage: string;
    amountCents: number;
    currency: string;
    status: string;
    payoutMethodPreview: string | null;
    transactionReference: string | null;
    paidAt: Date | null;
    createdAt: Date;
  }>;
};

export async function getOwnEarnings(actor: Actor): Promise<PublisherEarningsSummary> {
  requireRole(actor.role, ["PUBLISHER", "ADMIN", "SUPER_ADMIN"]);

  const payouts = await prisma.publisherPayout.findMany({
    where: { publisherUserId: actor.id },
    include: {
      revenuePeriod: { select: { label: true, status: true, periodStart: true, periodEnd: true } },
      payoutAccount: { select: { maskedPreview: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalPaidCents = payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountCents, 0);
  const totalPendingCents = payouts
    .filter((p) => p.status === "PENDING" || p.status === "APPROVED")
    .reduce((s, p) => s + p.amountCents, 0);

  return {
    totalPaidCents,
    totalPendingCents,
    currency: payouts[0]?.currency ?? "DZD",
    payouts: payouts.map((p) => ({
      id: p.id,
      periodLabel: p.revenuePeriod.label,
      periodStatus: p.revenuePeriod.status,
      periodStart: p.revenuePeriod.periodStart,
      periodEnd: p.revenuePeriod.periodEnd,
      eligibleViews: p.eligibleViews,
      sharePercentage: p.sharePercentage.toString(),
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      payoutMethodPreview: p.payoutAccount?.maskedPreview ?? null,
      transactionReference: p.transactionReference,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
  };
}
