import { describe, it, expect, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  createPublisher,
  createSuperAdmin,
  createResource,
  createEligibleViews,
  createRevenuePeriod,
  actorOf,
} from "../setup/factories";
import { finalizeRevenuePeriod } from "@/server/services/revenue-period.service";
import { ValidationError } from "@/server/services/resource.service";

describe("duplicate payout prevention", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("DATABASE LAYER: rejects a second PublisherPayout row for the same (period, publisher) pair", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 1000,
    });

    await prisma.publisherPayout.create({
      data: {
        revenuePeriodId: period.id,
        publisherUserId: publisher.id,
        eligibleViews: 1,
        totalEligibleViews: 1,
        sharePercentage: new Prisma.Decimal("50.0000"),
        amountCents: 500,
        status: "PENDING",
      },
    });

    await expect(
      prisma.publisherPayout.create({
        data: {
          revenuePeriodId: period.id,
          publisherUserId: publisher.id,
          eligibleViews: 1,
          totalEligibleViews: 1,
          sharePercentage: new Prisma.Decimal("50.0000"),
          amountCents: 500,
          status: "PENDING",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" }); // Prisma's unique-constraint-violation code
  });

  it("SERVICE LAYER: finalizing an already-finalized period is refused, not silently re-run", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 4, new Date("2026-01-10T00:00:00Z"));
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 4000,
    });

    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    await expect(finalizeRevenuePeriod(actorOf(superAdmin), period.id)).rejects.toThrow(ValidationError);

    const payoutCount = await prisma.publisherPayout.count({ where: { revenuePeriodId: period.id } });
    expect(payoutCount).toBe(1);
  });

  it("CONCURRENCY: two simultaneous finalize calls on the same DRAFT period produce exactly one winner, no duplicate payout, no duplicate audit log", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 20, new Date("2026-01-10T00:00:00Z"));
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 20000,
    });

    const results = await Promise.allSettled([
      finalizeRevenuePeriod(actorOf(superAdmin), period.id),
      finalizeRevenuePeriod(actorOf(superAdmin), period.id),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    // Exactly one of the two concurrent calls must win — the other must
    // be cleanly rejected (either by the atomic DRAFT->FINALIZED claim
    // returning count 0, or by the payout unique constraint), never both
    // succeeding and never both failing.
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const payoutCount = await prisma.publisherPayout.count({
      where: { revenuePeriodId: period.id, publisherUserId: publisher.id },
    });
    expect(payoutCount).toBe(1);

    // JSON metadata filtering syntax varies across Prisma versions, so
    // filter in JS against a plain findMany rather than relying on a
    // Prisma JSON-path query operator that may not match the installed
    // version — this is the assertion that actually matters here.
    const allLogs = await prisma.moderationLog.findMany({ where: { action: "FINALIZE_REVENUE_PERIOD" } });
    const logsForThisPeriod = allLogs.filter((l) => (l.metadata as { revenuePeriodId?: string } | null)?.revenuePeriodId === period.id);
    expect(logsForThisPeriod.length).toBe(1);
  });

  it("CONCURRENCY: race also produces no duplicate when there are zero eligible views (the branch with no DB unique-constraint backstop)", async () => {
    const superAdmin = await createSuperAdmin();
    // No resource, no views — deliberately the zero-eligible-views path.
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 5000,
    });

    const results = await Promise.allSettled([
      finalizeRevenuePeriod(actorOf(superAdmin), period.id),
      finalizeRevenuePeriod(actorOf(superAdmin), period.id),
    ]);

    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    expect(results.filter((r) => r.status === "rejected").length).toBe(1);

    const allLogs = await prisma.moderationLog.findMany({ where: { action: "FINALIZE_REVENUE_PERIOD" } });
    const logsForThisPeriod = allLogs.filter((l) => (l.metadata as { revenuePeriodId?: string } | null)?.revenuePeriodId === period.id);
    expect(logsForThisPeriod.length).toBe(1);
  });
});
