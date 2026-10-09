-- Phase 17: Publisher Payout Subsystem
--
-- Replaces the old flat, single-method PublisherProfile.bankRIB/bankName
-- fields (never used by any code path except manual admin lookup) with a
-- proper extensible subsystem:
--
--   - PublisherPayoutAccount: one row per payout method a publisher has
--     submitted. Sensitive fields (CCP account number, CCP key/clé, RIP)
--     are encrypted at the application layer (AES-256-GCM) before they
--     ever reach this database — `encryptedDetails` is opaque ciphertext,
--     never queried or indexed on its content.
--   - PayoutStatus gains APPROVED and FAILED so a payout follows
--     Pending -> Approved -> Paid / Failed instead of the old binary
--     Pending -> Paid.
--   - PublisherPayout gains a snapshot reference to the account used,
--     an approver, a transaction reference, and a failure reason.
--   - ModerationLog gains payoutAccountId/payoutId + a non-sensitive
--     metadata column, following the exact precedent set by reportId in
--     the Phase 15 migration.
--
-- SECURITY NOTE: this migration creates no plaintext payment columns.
-- Do not add ccpNumber/ripNumber/etc as real columns later without going
-- through src/server/security/payout-encryption.ts — see schema.prisma
-- comments on PublisherPayoutAccount for the reasoning.
--
-- PREREQUISITE: same as every migration in this repo — assumes prior
-- migrations have already been applied.

-- ------------------------------------------------------------
-- 1. ModerationAction: new audit actions for the payout subsystem
-- ------------------------------------------------------------
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'SUBMIT_PAYOUT_ACCOUNT';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'UPDATE_PAYOUT_ACCOUNT';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'VERIFY_PAYOUT_ACCOUNT';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'REJECT_PAYOUT_ACCOUNT';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'DEACTIVATE_PAYOUT_ACCOUNT';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'REVEAL_PAYOUT_ACCOUNT_DETAILS';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'APPROVE_PAYOUT';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'MARK_PAYOUT_FAILED';

-- ------------------------------------------------------------
-- 2. New enums
-- ------------------------------------------------------------
CREATE TYPE "PayoutMethod" AS ENUM ('CCP_BARIDIMOB', 'BANK_TRANSFER_INTL', 'WISE', 'PAYPAL');
CREATE TYPE "PayoutAccountVerificationStatus" AS ENUM ('PENDING_REVIEW', 'VERIFIED', 'REJECTED');

-- PayoutStatus already exists (PENDING, PAID) — add the two new states.
-- Postgres enums can't have values removed/reordered in place; PENDING
-- and PAID keep their existing meaning, this only adds new states.
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- ------------------------------------------------------------
-- 3. PublisherPayoutAccount
-- ------------------------------------------------------------
CREATE TABLE "PublisherPayoutAccount" (
    "id" TEXT NOT NULL,
    "publisherUserId" TEXT NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "legalFullName" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'DZ',
    "encryptedDetails" TEXT NOT NULL,
    "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "maskedPreview" TEXT NOT NULL,
    "verificationStatus" "PayoutAccountVerificationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherPayoutAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublisherPayoutAccount_publisherUserId_idx" ON "PublisherPayoutAccount"("publisherUserId");
CREATE INDEX "PublisherPayoutAccount_verificationStatus_idx" ON "PublisherPayoutAccount"("verificationStatus");

ALTER TABLE "PublisherPayoutAccount" ADD CONSTRAINT "PublisherPayoutAccount_publisherUserId_fkey"
    FOREIGN KEY ("publisherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublisherPayoutAccount" ADD CONSTRAINT "PublisherPayoutAccount_verifiedById_fkey"
    FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- 4. PublisherPayout: new columns
-- ------------------------------------------------------------
ALTER TABLE "PublisherPayout" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'DZD';
ALTER TABLE "PublisherPayout" ADD COLUMN "payoutAccountId" TEXT;
ALTER TABLE "PublisherPayout" ADD COLUMN "payoutMethod" "PayoutMethod";
ALTER TABLE "PublisherPayout" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "PublisherPayout" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "PublisherPayout" ADD COLUMN "transactionReference" TEXT;
ALTER TABLE "PublisherPayout" ADD COLUMN "failureReason" TEXT;
ALTER TABLE "PublisherPayout" ADD COLUMN "failedAt" TIMESTAMP(3);
-- updatedAt: backfill existing rows to createdAt, then enforce NOT NULL,
-- matching Prisma's own strategy for adding a required column to a
-- populated table.
ALTER TABLE "PublisherPayout" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "PublisherPayout" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "PublisherPayout" ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE INDEX "PublisherPayout_payoutAccountId_idx" ON "PublisherPayout"("payoutAccountId");

ALTER TABLE "PublisherPayout" ADD CONSTRAINT "PublisherPayout_payoutAccountId_fkey"
    FOREIGN KEY ("payoutAccountId") REFERENCES "PublisherPayoutAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PublisherPayout" ADD CONSTRAINT "PublisherPayout_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- 5. ModerationLog: payout references + non-sensitive metadata
-- ------------------------------------------------------------
ALTER TABLE "ModerationLog" ADD COLUMN "payoutAccountId" TEXT;
ALTER TABLE "ModerationLog" ADD COLUMN "payoutId" TEXT;
ALTER TABLE "ModerationLog" ADD COLUMN "metadata" JSONB;

CREATE INDEX "ModerationLog_payoutAccountId_idx" ON "ModerationLog"("payoutAccountId");
CREATE INDEX "ModerationLog_payoutId_idx" ON "ModerationLog"("payoutId");
