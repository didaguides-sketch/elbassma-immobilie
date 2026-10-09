-- Phase 17c: payout security audit fixes (database layer)
--
-- Found during the pre-launch financial/security audit of the payout
-- subsystem: "one active PublisherPayoutAccount per (publisher, method)"
-- was enforced only in application code (deactivate-old + create-new
-- inside one transaction in payout-account.service.ts). Under Postgres's
-- default READ COMMITTED isolation, two concurrent submissions from the
-- same publisher (e.g. a double-click, or two browser tabs) can each
-- read "no currently-active row" before either commits, and both then
-- commit an active row — leaving two simultaneously-active accounts for
-- the same publisher+method. That's a real data-integrity bug, not a
-- theoretical one: which of the two accounts finalizeRevenuePeriod picks
-- up would then depend on Map insertion order, i.e. undefined.
--
-- This partial unique index makes the invariant a database guarantee:
-- Postgres will reject the second concurrent INSERT/UPDATE outright
-- rather than silently allowing two active rows to coexist. Cannot be
-- expressed in prisma/schema.prisma's DSL (no WHERE clause on @@unique),
-- so it lives only in this migration — documented in schema.prisma next
-- to the PublisherPayoutAccount model.
CREATE UNIQUE INDEX "PublisherPayoutAccount_one_active_per_publisher_method"
    ON "PublisherPayoutAccount" ("publisherUserId", "method")
    WHERE "isActive" = true;
