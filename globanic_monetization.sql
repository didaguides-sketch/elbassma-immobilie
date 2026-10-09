-- Globanic — Monetization / Publisher Payouts schema
-- Run once via psql, same as globanic_init.sql was.

BEGIN;

-- ============================================================
-- New enums
-- ============================================================

CREATE TYPE "RevenuePeriodStatus" AS ENUM ('DRAFT', 'FINALIZED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID');

-- ============================================================
-- Bank/payment info on PublisherProfile (required before any
-- payout can be marked PAID for that publisher)
-- ============================================================

ALTER TABLE "PublisherProfile" ADD COLUMN "bankAccountHolder" TEXT;
ALTER TABLE "PublisherProfile" ADD COLUMN "bankName" TEXT;
ALTER TABLE "PublisherProfile" ADD COLUMN "bankRIB" TEXT;
ALTER TABLE "PublisherProfile" ADD COLUMN "paymentInfoUpdatedAt" TIMESTAMP(3);

-- ============================================================
-- Dwell-time tracking: a view only becomes payout-eligible after
-- the client confirms the visitor stayed long enough. This is a
-- separate, later update to the row — not decided at creation time
-- the way `isEligible` is.
-- ============================================================

ALTER TABLE "ResourceView" ADD COLUMN "qualifiedAt" TIMESTAMP(3);

-- ============================================================
-- RevenuePeriod — one row per distribution period (e.g. a month),
-- holding the total AdSense revenue the admin entered by hand.
-- ============================================================

CREATE TABLE "RevenuePeriod" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "label" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "totalRevenueCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'DZD',
  "status" "RevenuePeriodStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizedAt" TIMESTAMP(3)
);
CREATE INDEX "RevenuePeriod_status_idx" ON "RevenuePeriod"("status");
ALTER TABLE "RevenuePeriod" ADD CONSTRAINT "RevenuePeriod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- PublisherPayout — one row per publisher per period, with the
-- exact numbers behind their share (transparency for the publisher).
-- ============================================================

CREATE TABLE "PublisherPayout" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "revenuePeriodId" TEXT NOT NULL,
  "publisherUserId" TEXT NOT NULL,
  "eligibleViews" INTEGER NOT NULL,
  "totalEligibleViews" INTEGER NOT NULL,
  "sharePercentage" DECIMAL(7,4) NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "PublisherPayout_revenuePeriodId_publisherUserId_key" ON "PublisherPayout"("revenuePeriodId", "publisherUserId");
CREATE INDEX "PublisherPayout_publisherUserId_idx" ON "PublisherPayout"("publisherUserId");
CREATE INDEX "PublisherPayout_status_idx" ON "PublisherPayout"("status");
ALTER TABLE "PublisherPayout" ADD CONSTRAINT "PublisherPayout_revenuePeriodId_fkey" FOREIGN KEY ("revenuePeriodId") REFERENCES "RevenuePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublisherPayout" ADD CONSTRAINT "PublisherPayout_publisherUserId_fkey" FOREIGN KEY ("publisherUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Audit trail: extend ModerationAction with the two new admin
-- actions this feature introduces (consistent with the project's
-- existing pattern of logging every admin action).
-- ============================================================

ALTER TYPE "ModerationAction" ADD VALUE 'FINALIZE_REVENUE_PERIOD';
ALTER TYPE "ModerationAction" ADD VALUE 'MARK_PAYOUT_PAID';

COMMIT;
