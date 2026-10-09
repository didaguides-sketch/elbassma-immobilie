-- Phase 17b: per-publisher revenue share override
--
-- Until now the platform-wide publisher share was a single hardcoded
-- constant (DEFAULT_PUBLISHER_SHARE_PERCENTAGE in
-- revenue-period.service.ts) with no way to give an individual publisher
-- a different rate. This adds a nullable override on PublisherProfile:
-- NULL means "use the platform default," a real value (including 0)
-- means an admin deliberately set this publisher's rate. The distinction
-- matters — collapsing "unset" and "zero" into the same NULL would make
-- it impossible to tell "no override configured" from "admin set this
-- publisher's share to zero on purpose."
ALTER TABLE "PublisherProfile" ADD COLUMN "payoutSharePercentage" DECIMAL(7,4);

ALTER TYPE "ModerationAction" ADD VALUE IF NOT EXISTS 'SET_PUBLISHER_SHARE_PERCENTAGE';
