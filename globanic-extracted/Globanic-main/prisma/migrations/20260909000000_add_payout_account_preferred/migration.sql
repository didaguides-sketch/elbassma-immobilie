-- Phase 13.5B: generic "preferred payout account" selection.
--
-- Problem this closes: finalizeRevenuePeriod previously selected a
-- publisher's payout account with a hardcoded `method = 'CCP_BARIDIMOB'`
-- filter (see revenue-period.service.ts pre-13.5B). The schema already
-- allowed a publisher to hold multiple simultaneously-active, verified
-- accounts across different methods (one active row per method, per the
-- 20260907020000 migration) — finalization had no method-agnostic way to
-- know which one to actually use. `preferred` is that missing signal:
-- exactly one account, across ALL of a publisher's methods, may be
-- flagged as the one to use for their next payout.
--
-- Additive only: no existing column is altered or dropped, no existing
-- row is deleted, and no historical PublisherPayout row is touched by
-- this migration (payout history is keyed on payoutAccountId/payoutMethod
-- snapshots on PublisherPayout itself, entirely separate from this flag).

ALTER TABLE "PublisherPayoutAccount" ADD COLUMN "preferred" BOOLEAN NOT NULL DEFAULT false;

-- Continuity backfill: a publisher whose account already worked (active +
-- VERIFIED) before this migration should not silently lose payout
-- eligibility the moment finalization starts requiring `preferred = true`
-- instead of assuming CCP.
--
-- This UPDATE only marks a row preferred when it is the ONLY active +
-- VERIFIED row that publisher currently has. In practice, since no
-- payout method other than CCP_BARIDIMOB has ever been submittable
-- through the application (submitPayoutAccount/CcpPayoutAccountForm),
-- every publisher with any active+verified account today has exactly
-- one, so this backfill is expected to promote all of them. The
-- "exactly one" guard is written anyway, rather than assumed, so this
-- migration is correct regardless of that assumption: if any publisher
-- unexpectedly already had more than one simultaneously active+verified
-- account (not reachable via the current UI, but not something a schema
-- migration should take on faith), that publisher is skipped entirely
-- rather than guessing which account to prefer — they simply fall back
-- to the same safe, already-existing "no preferred account" path that
-- finalizeRevenuePeriod already handles (payoutAccountId = null), and an
-- admin/publisher can explicitly set one afterward. This guard is also
-- what guarantees the UPDATE below cannot itself violate the unique
-- index created after it.
UPDATE "PublisherPayoutAccount" AS ppa
SET "preferred" = true
WHERE ppa."isActive" = true
  AND ppa."verificationStatus" = 'VERIFIED'
  AND (
    SELECT COUNT(*)
    FROM "PublisherPayoutAccount" AS other
    WHERE other."publisherUserId" = ppa."publisherUserId"
      AND other."isActive" = true
      AND other."verificationStatus" = 'VERIFIED'
  ) = 1;

-- Same pattern as the existing one-active-account-per-method index
-- (20260907020000): a DB-level partial unique index, not just an
-- application-layer check, so a race between two concurrent
-- "set preferred" calls (or two tabs) fails loudly on the losing
-- transaction instead of silently leaving two preferred rows — which
-- finalizeRevenuePeriod's selection query assumes cannot happen.
CREATE UNIQUE INDEX "PublisherPayoutAccount_one_preferred_per_publisher"
    ON "PublisherPayoutAccount" ("publisherUserId")
    WHERE "preferred" = true;
