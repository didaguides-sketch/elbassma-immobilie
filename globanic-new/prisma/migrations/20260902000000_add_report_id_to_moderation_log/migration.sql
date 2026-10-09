-- Phase 15: Reports
--
-- Adds `ModerationLog.reportId`, the correct reference field for the
-- RESOLVE_REPORT / DISMISS_REPORT actions. `Report` and `ReportType` /
-- `ReportStatus` / `ModerationAction.RESOLVE_REPORT` / `DISMISS_REPORT`
-- have all existed since the pre-Phase-10 baseline (declared in
-- schema.prisma, never used in code) — this migration is the one actual
-- schema change Phase 15 needs: without it, resolving/dismissing a
-- report could only be logged against `resourceId`, which is ambiguous
-- the moment a resource has more than one OPEN report.
--
-- FK HAS NO ON DELETE CASCADE, DELIBERATELY:
-- Same reasoning already documented in resource.service.ts for
-- `moderationLogs.resourceId` (see the DELETE action's comment there) —
-- Reports, like Resources, are never deleted by this app (only
-- resolved/dismissed), so the audit trail is never expected to outlive
-- its target. Leaving the default (no ON DELETE clause -> NO ACTION)
-- means a future accidental `Report` delete would be blocked rather
-- than silently orphaning/nulling audit rows, matching the existing
-- resourceId relation's behavior exactly.
--
-- IDEMPOTENCY:
-- `ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` are safe to
-- re-run, per the discipline established in the Phase 10 migration. The
-- FK constraint is wrapped in a guarded DO block because PostgreSQL has
-- no `ADD CONSTRAINT IF NOT EXISTS` syntax.
--
-- PREREQUISITE:
-- Assumes the "ModerationLog" and "Report" tables already exist (every
-- table through Phase 14 — see README.md "Activating Full-Text Search"
-- for one-time setup on a completely fresh database).

BEGIN;

ALTER TABLE "ModerationLog" ADD COLUMN IF NOT EXISTS "reportId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ModerationLog_reportId_fkey'
  ) THEN
    ALTER TABLE "ModerationLog"
      ADD CONSTRAINT "ModerationLog_reportId_fkey"
      FOREIGN KEY ("reportId") REFERENCES "Report"("id")
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ModerationLog_reportId_idx" ON "ModerationLog"("reportId");

COMMIT;
