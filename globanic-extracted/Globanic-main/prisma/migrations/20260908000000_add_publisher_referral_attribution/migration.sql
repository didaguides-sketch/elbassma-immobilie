-- Phase 8.5: Publisher Referral / Attribution
--
-- Adds a permanent per-publisher referral identity ("/p/{code}") and a
-- stateful (not event-logged) attribution record per anonymous session
-- or authenticated user, plus one nullable pointer from ResourceView to
-- whichever attribution was active when that view was recorded.
--
-- HARD INVARIANT: nothing in this migration touches Resource,
-- RevenuePeriod, PublisherPayout, or PublisherPayoutAccount. Revenue
-- ownership remains exclusively Resource.uploadedById. This subsystem
-- is additive metadata read alongside the existing view-tracking insert
-- point, never a dependency of eligibility or payout calculation.
--
-- No backfill: existing ResourceView rows correctly get
-- referralAttributionId = NULL — they genuinely had no attribution.

-- ------------------------------------------------------------
-- 1. Enum
-- ------------------------------------------------------------
CREATE TYPE "ReferralLinkStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- ------------------------------------------------------------
-- 2. PublisherReferralLink
-- ------------------------------------------------------------
CREATE TABLE "PublisherReferralLink" (
    "id" TEXT NOT NULL,
    "publisherUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReferralLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PublisherReferralLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublisherReferralLink_code_key" ON "PublisherReferralLink"("code");
CREATE INDEX "PublisherReferralLink_publisherUserId_idx" ON "PublisherReferralLink"("publisherUserId");
CREATE INDEX "PublisherReferralLink_status_idx" ON "PublisherReferralLink"("status");

-- One ACTIVE link per publisher, enforced by the database — Prisma's
-- schema DSL cannot express a filtered unique constraint, so this lives
-- only here (same technique already used for
-- PublisherPayoutAccount_one_active_per_publisher_method).
CREATE UNIQUE INDEX "PublisherReferralLink_one_active_per_publisher"
    ON "PublisherReferralLink" ("publisherUserId")
    WHERE "status" = 'ACTIVE';

ALTER TABLE "PublisherReferralLink" ADD CONSTRAINT "PublisherReferralLink_publisherUserId_fkey"
    FOREIGN KEY ("publisherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- 3. ReferralAttribution
-- ------------------------------------------------------------
CREATE TABLE "ReferralAttribution" (
    "id" TEXT NOT NULL,
    "publisherReferralLinkId" TEXT NOT NULL,
    "anonymousSessionId" TEXT,
    "userId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "supersededById" TEXT,

    CONSTRAINT "ReferralAttribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralAttribution_supersededById_key" ON "ReferralAttribution"("supersededById");
CREATE INDEX "ReferralAttribution_anonymousSessionId_idx" ON "ReferralAttribution"("anonymousSessionId");
CREATE INDEX "ReferralAttribution_userId_idx" ON "ReferralAttribution"("userId");
CREATE INDEX "ReferralAttribution_expiresAt_idx" ON "ReferralAttribution"("expiresAt");
CREATE INDEX "ReferralAttribution_publisherReferralLinkId_idx" ON "ReferralAttribution"("publisherReferralLinkId");

-- At most one LIVE (non-superseded — see the partial condition below)
-- attribution per anonymous session, and separately per authenticated
-- user. "Live" here is approximated at the DB level as "not yet
-- superseded" (supersededById IS NULL); expiry (expiresAt > now()) is
-- a runtime condition Postgres partial indexes cannot reference, so it
-- is additionally enforced by referral.service.ts always querying by
-- "newest row, not superseded, not expired" rather than relying on the
-- index alone for expiry — the index's job is only to prevent two
-- simultaneously-live (non-superseded) rows from ever coexisting for
-- the same session or user, which is exactly the concurrency guarantee
-- required.
CREATE UNIQUE INDEX "ReferralAttribution_one_live_per_session"
    ON "ReferralAttribution" ("anonymousSessionId")
    WHERE "supersededById" IS NULL AND "anonymousSessionId" IS NOT NULL;

CREATE UNIQUE INDEX "ReferralAttribution_one_live_per_user"
    ON "ReferralAttribution" ("userId")
    WHERE "supersededById" IS NULL AND "userId" IS NOT NULL;

ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_publisherReferralLinkId_fkey"
    FOREIGN KEY ("publisherReferralLinkId") REFERENCES "PublisherReferralLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_supersededById_fkey"
    FOREIGN KEY ("supersededById") REFERENCES "ReferralAttribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- 4. ResourceView: one new nullable column
-- ------------------------------------------------------------
ALTER TABLE "ResourceView" ADD COLUMN "referralAttributionId" TEXT;
CREATE INDEX "ResourceView_referralAttributionId_idx" ON "ResourceView"("referralAttributionId");
ALTER TABLE "ResourceView" ADD CONSTRAINT "ResourceView_referralAttributionId_fkey"
    FOREIGN KEY ("referralAttributionId") REFERENCES "ReferralAttribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
