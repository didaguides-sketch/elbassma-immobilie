-- Phase 14: Admin User Management
--
-- Adds CHANGE_ROLE to the ModerationAction enum so that a SUPER_ADMIN
-- changing a user's role between USER/ADMIN/SUPER_ADMIN is recorded in
-- the same audit trail (ModerationLog) as every other administrative
-- action in this app — same discipline already applied to resource
-- moderation, publisher verification, and user suspension.
--
-- IDEMPOTENCY: `ADD VALUE IF NOT EXISTS` (PostgreSQL 12+) makes this safe
-- to re-run.
--
-- PREREQUISITE: same as every migration in this repo since Phase 10 (see
-- README.md "Activating Full-Text Search") — this assumes the
-- ModerationAction enum type already exists in the target database.

ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'CHANGE_ROLE';
