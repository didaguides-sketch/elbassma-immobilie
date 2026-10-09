-- Phase 16: Universities & Domains Admin
--
-- Adds 6 ModerationAction enum values so that every admin CRUD mutation
-- on University/Domain writes to the same audit trail as every other
-- admin action in this app — same discipline as Phase 14's CHANGE_ROLE
-- and Phase 15's RESOLVE_REPORT/DISMISS_REPORT (the latter pre-existed;
-- these six do not, since nothing in the schema anticipated catalog CRUD
-- before this phase).
--
-- NO NEW ModerationLog COLUMNS: unlike Phase 15's `reportId` (needed
-- because a resource can have multiple simultaneous OPEN reports, making
-- `resourceId` alone ambiguous), a University/Domain CRUD action always
-- has exactly one unambiguous subject. Following the exact precedent
-- already established for Resource deletion (resource.service.ts's
-- `deleteResource`), the entity's name/id is embedded in `reason` instead
-- of adding new reference columns.
--
-- IDEMPOTENCY: `ADD VALUE IF NOT EXISTS` (PostgreSQL 12+) makes this safe
-- to re-run, per the discipline established in the Phase 14 migration.
--
-- PREREQUISITE: same as every migration in this repo since Phase 10 —
-- assumes the "ModerationAction" enum type already exists in the target
-- database (via your own `prisma migrate dev`/`db push` runs after each
-- prior phase, including Phase 15's migration).

ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'CREATE_UNIVERSITY';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'UPDATE_UNIVERSITY';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'DELETE_UNIVERSITY';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'CREATE_DOMAIN';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'UPDATE_DOMAIN';
ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'DELETE_DOMAIN';
