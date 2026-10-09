-- Phase 13.5B: adds SET_PREFERRED_PAYOUT_ACCOUNT to the ModerationAction
-- enum so that a publisher designating a preferred payout account is
-- recorded in the same audit trail as every other payout-account
-- mutation (SUBMIT/UPDATE/VERIFY/REJECT_PAYOUT_ACCOUNT).
--
-- IDEMPOTENCY: `ADD VALUE IF NOT EXISTS` (PostgreSQL 12+) makes this safe
-- to re-run, same convention as 20260824000000_add_change_role_moderation_action.
--
-- PREREQUISITE: assumes the ModerationAction enum type already exists in
-- the target database (it does — created in the initial schema).

ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'SET_PREFERRED_PAYOUT_ACCOUNT';
