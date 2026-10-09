-- Phase 10: Full-Text Search
--
-- Activates `Resource.searchVector` (declared in schema.prisma as
-- `Unsupported("tsvector")?` since Phase 1) as a real PostgreSQL
-- GENERATED ALWAYS AS (...) STORED column, plus its GIN index.
--
-- Weighting: title (A, highest) > keywords (B) > abstract (C) > description (D, lowest).
-- PostgreSQL's `ts_rank()` uses these weights automatically when ranking
-- results by relevance (see postgres.provider.ts).
--
-- WHY DROP + ADD instead of ALTER COLUMN:
-- PostgreSQL does not support adding a GENERATED ALWAYS AS expression to
-- an already-existing column via ALTER COLUMN — a generated column's
-- generation expression can only be set at column-creation time. This is
-- a PostgreSQL limitation, not a workaround of convenience.
--
-- IDEMPOTENCY / SAFETY:
-- `DROP COLUMN IF EXISTS` + `ADD COLUMN` is safe to re-run: whether the
-- column doesn't exist yet, or already exists (e.g. as the plain,
-- non-generated nullable tsvector column an early `prisma migrate dev`
-- run may have created from the `Unsupported()` declaration alone), the
-- end state after this migration is identical. `CREATE INDEX IF NOT
-- EXISTS` is likewise safe to re-run.
--
-- DATA PRESERVATION:
-- `searchVector` has never been anything other than a derived value of
-- title/keywords/abstract/description. Dropping and recreating it touches
-- no other column and loses no information — the generated expression
-- recomputes it identically for every existing row the moment the column
-- exists again.
--
-- PREREQUISITE:
-- This migration ALTERs an existing "Resource" table — it does not create
-- it. It assumes every table through Phase 9 already exists in the
-- target database (via your own `prisma migrate dev`/`db push` runs after
-- each prior phase). See README.md "Activating Full-Text Search" for the
-- exact one-time setup steps on a completely fresh database, where no
-- committed baseline migration exists yet.

BEGIN;

ALTER TABLE "Resource" DROP COLUMN IF EXISTS "searchVector";

ALTER TABLE "Resource"
  ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('french', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('french', coalesce(array_to_string("keywords", ' '), '')), 'B') ||
    setweight(to_tsvector('french', coalesce("abstract", '')), 'C') ||
    setweight(to_tsvector('french', coalesce("description", '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS "Resource_searchVector_idx"
  ON "Resource" USING GIN ("searchVector");

COMMIT;
