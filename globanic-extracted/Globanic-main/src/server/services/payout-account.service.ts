import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { can, requireRole, ForbiddenError, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "./resource.service";
import {
  buildMaskedPreview,
  type PayoutAccountInput,
} from "@/lib/validation/payout-account.schema";
import { encryptPayoutDetails, decryptPayoutDetails } from "@/server/security/payout-encryption";

type Actor = { id: string; role: Role };

/** Safe-to-render shape — never includes encryptedDetails or a decrypted payload. */
export type PayoutAccountSummary = {
  id: string;
  method: string;
  legalFullName: string;
  country: string;
  maskedPreview: string;
  verificationStatus: string;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  isActive: boolean;
  preferred: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toSummary(row: {
  id: string;
  method: string;
  legalFullName: string;
  country: string;
  maskedPreview: string;
  verificationStatus: string;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  isActive: boolean;
  preferred: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PayoutAccountSummary {
  return {
    id: row.id,
    method: row.method,
    legalFullName: row.legalFullName,
    country: row.country,
    maskedPreview: row.maskedPreview,
    verificationStatus: row.verificationStatus,
    verifiedAt: row.verifiedAt,
    rejectionReason: row.rejectionReason,
    isActive: row.isActive,
    preferred: row.preferred,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ------------------------------------------------------------
// PUBLISHER: submit / update
// ------------------------------------------------------------

/**
 * Submitting a new account for a method the publisher already has an
 * active account for supersedes it: the old row is deactivated (kept for
 * history — any past payout still points at it via payoutAccountId) and
 * a fresh row is created in PENDING_REVIEW. This means an edit always
 * re-triggers admin verification — a publisher can't silently change
 * their CCP number on an already-verified account without review, which
 * matters because that account is where real money gets sent.
 */
export async function submitPayoutAccount(actor: Actor, input: PayoutAccountInput) {
  requireRole(actor.role, ["PUBLISHER", "ADMIN", "SUPER_ADMIN"]);

  const { method, legalFullName, country, ...sensitiveFields } = input;
  const { encryptedDetails, encryptionKeyVersion } = encryptPayoutDetails(sensitiveFields);
  const maskedPreview = buildMaskedPreview(input);

  const wasEditing = await prisma.publisherPayoutAccount.findFirst({
    where: { publisherUserId: actor.id, method, isActive: true },
    select: { id: true },
  });

  let created: Awaited<ReturnType<typeof prisma.publisherPayoutAccount.create>>;
  try {
    [, created] = await prisma.$transaction([
      prisma.publisherPayoutAccount.updateMany({
        where: { publisherUserId: actor.id, method, isActive: true },
        data: { isActive: false },
      }),
      prisma.publisherPayoutAccount.create({
        data: {
          publisherUserId: actor.id,
          method,
          legalFullName,
          country,
          encryptedDetails,
          encryptionKeyVersion,
          maskedPreview,
          verificationStatus: "PENDING_REVIEW",
        },
      }),
    ]);
  } catch (error) {
    // P2002 here means the DB-level partial unique index
    // (one active account per publisher+method — see the payout
    // security audit migration 20260907020000) rejected this insert
    // because a concurrent submission from the same publisher won the
    // race. Surface a clean, expected, typed error instead of leaking
    // the raw Prisma exception — found while building the payout-
    // account-concurrency test, which would otherwise have had to
    // assert on an internal Prisma error shape.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ValidationError(
        "تم إرسال معلومات دفع أخرى لنفس الطريقة في نفس اللحظة. يرجى إعادة المحاولة.",
      );
    }
    throw error;
  }

  await prisma.moderationLog.create({
    data: {
      actorId: actor.id,
      payoutAccountId: created.id,
      action: wasEditing ? "UPDATE_PAYOUT_ACCOUNT" : "SUBMIT_PAYOUT_ACCOUNT",
      metadata: { method, maskedPreview },
    },
  });

  return toSummary(created);
}

export async function listOwnPayoutAccounts(actor: Actor): Promise<PayoutAccountSummary[]> {
  requireRole(actor.role, ["PUBLISHER", "ADMIN", "SUPER_ADMIN"]);
  const rows = await prisma.publisherPayoutAccount.findMany({
    where: { publisherUserId: actor.id },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toSummary);
}

/**
 * Publisher designates which of their OWN accounts should be used for
 * their next payout. This is the only place `preferred` is ever set to
 * true — never automatically on submission (see submitPayoutAccount's
 * docblock) and never automatically transferred when an account is
 * replaced/deactivated. The publisher must explicitly call this again
 * once a replacement account becomes VERIFIED.
 *
 * Eligibility is enforced here (own account, active, VERIFIED) — but
 * this function is NOT the only place that matters: finalizeRevenuePeriod
 * re-checks isActive/VERIFIED itself at selection time, since an account
 * that was preferred here could be deactivated or rejected afterward
 * without this flag being cleared (documented on the schema field).
 * `preferred = true` is therefore a necessary but never sufficient
 * condition for being selected — this function does not change that
 * invariant, only lets a publisher express the intent.
 *
 * Same transactional pattern as submitPayoutAccount: clear any existing
 * preferred row for this publisher, then set the new one, in one
 * transaction — the partial unique index
 * (PublisherPayoutAccount_one_preferred_per_publisher, see the Phase
 * 13.5B migration) is the database-level race-safety net if two such
 * calls somehow overlap, exactly mirroring how the existing per-method
 * active-account index backstops submitPayoutAccount.
 */
export async function setPreferredPayoutAccount(actor: Actor, payoutAccountId: string) {
  requireRole(actor.role, ["PUBLISHER", "ADMIN", "SUPER_ADMIN"]);

  const account = await prisma.publisherPayoutAccount.findUnique({
    where: { id: payoutAccountId },
  });
  if (!account) throw new NotFoundError();
  // Ownership check first, and phrased identically to a not-found rather
  // than a forbidden — never confirm to the caller that a payout-account
  // id belonging to someone else exists.
  if (account.publisherUserId !== actor.id) throw new NotFoundError();
  if (!account.isActive) {
    throw new ValidationError("لا يمكن اعتماد حساب دفع غير نشط كحساب مفضّل.");
  }
  if (account.verificationStatus !== "VERIFIED") {
    throw new ValidationError("لا يمكن اعتماد حساب دفع غير موثّق كحساب مفضّل بعد.");
  }
  if (account.preferred) {
    // Idempotent no-op — already the preferred account.
    return toSummary(account);
  }

  let updated: Awaited<ReturnType<typeof prisma.publisherPayoutAccount.update>>;
  try {
    [, updated] = await prisma.$transaction([
      prisma.publisherPayoutAccount.updateMany({
        where: { publisherUserId: actor.id, preferred: true },
        data: { preferred: false },
      }),
      prisma.publisherPayoutAccount.update({
        where: { id: payoutAccountId },
        data: { preferred: true },
      }),
    ]);
  } catch (error) {
    // P2002 here means the DB-level partial unique index rejected this
    // update because a concurrent "set preferred" call from the same
    // publisher (e.g. a double-click, or two tabs) won the race — same
    // shape of guard, and same reasoning, as submitPayoutAccount's P2002
    // handling above.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ValidationError(
        "تم تحديث الحساب المفضّل للتو من مكان آخر. يرجى إعادة المحاولة.",
      );
    }
    throw error;
  }

  await prisma.moderationLog.create({
    data: {
      actorId: actor.id,
      payoutAccountId: updated.id,
      action: "SET_PREFERRED_PAYOUT_ACCOUNT",
      metadata: { method: updated.method, maskedPreview: updated.maskedPreview },
    },
  });

  return toSummary(updated);
}

// ------------------------------------------------------------
// ADMIN: review queue
// ------------------------------------------------------------

export async function listPendingPayoutAccounts(actor: Actor) {
  if (!can(actor.role, "payout-account:verify")) throw new ForbiddenError();
  const rows = await prisma.publisherPayoutAccount.findMany({
    where: { verificationStatus: "PENDING_REVIEW", isActive: true },
    include: {
      publisher: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, payoutSharePercentage: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({ ...toSummary(r), publisher: r.publisher }));
}

/**
 * The only function in the codebase that returns decrypted CCP/RIP
 * values. Restricted to admins with payout-account:verify, and every
 * call writes a REVEAL_PAYOUT_ACCOUNT_DETAILS audit entry — this is a
 * read of financially sensitive PII and must be traceable to a specific
 * admin at a specific time, same as the reasoning already documented on
 * ResourceView.payoutEligible for why financially-sensitive data gets
 * extra handling in this codebase.
 */
export async function revealPayoutAccountDetails(actor: Actor, payoutAccountId: string) {
  if (!can(actor.role, "payout-account:reveal")) throw new ForbiddenError();

  const account = await prisma.publisherPayoutAccount.findUnique({ where: { id: payoutAccountId } });
  if (!account) throw new NotFoundError();

  const details = decryptPayoutDetails(account.encryptedDetails, account.encryptionKeyVersion);

  await prisma.moderationLog.create({
    data: {
      actorId: actor.id,
      payoutAccountId: account.id,
      action: "REVEAL_PAYOUT_ACCOUNT_DETAILS",
      metadata: { publisherUserId: account.publisherUserId, method: account.method },
    },
  });

  return { ...toSummary(account), details };
}

export async function verifyPayoutAccount(actor: Actor, payoutAccountId: string) {
  if (!can(actor.role, "payout-account:verify")) throw new ForbiddenError();

  const account = await prisma.publisherPayoutAccount.findUnique({ where: { id: payoutAccountId } });
  if (!account) throw new NotFoundError();
  if (!account.isActive) throw new ValidationError("لا يمكن التحقق من حساب دفع غير نشط.");

  const [updated] = await prisma.$transaction([
    prisma.publisherPayoutAccount.update({
      where: { id: payoutAccountId },
      data: { verificationStatus: "VERIFIED", verifiedById: actor.id, verifiedAt: new Date(), rejectionReason: null },
    }),
    prisma.moderationLog.create({
      data: {
        actorId: actor.id,
        payoutAccountId,
        action: "VERIFY_PAYOUT_ACCOUNT",
        metadata: { method: account.method, maskedPreview: account.maskedPreview },
      },
    }),
  ]);

  return toSummary(updated);
}

export async function rejectPayoutAccount(
  actor: Actor,
  payoutAccountId: string,
  rejectionReason: string,
) {
  if (!can(actor.role, "payout-account:verify")) throw new ForbiddenError();

  const account = await prisma.publisherPayoutAccount.findUnique({ where: { id: payoutAccountId } });
  if (!account) throw new NotFoundError();

  const [updated] = await prisma.$transaction([
    prisma.publisherPayoutAccount.update({
      where: { id: payoutAccountId },
      data: { verificationStatus: "REJECTED", rejectionReason, verifiedById: null, verifiedAt: null },
    }),
    prisma.moderationLog.create({
      data: {
        actorId: actor.id,
        payoutAccountId,
        action: "REJECT_PAYOUT_ACCOUNT",
        reason: rejectionReason,
        metadata: { method: account.method },
      },
    }),
  ]);

  return toSummary(updated);
}
