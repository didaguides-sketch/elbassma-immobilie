import { describe, it, expect, beforeEach } from "vitest";
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
import { finalizeRevenuePeriod, setPublisherSharePercentageOverride } from "@/server/services/revenue-period.service";
import { ValidationError } from "@/server/services/resource.service";

describe("revenue period finalization", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("DRAFT -> FINALIZED transition happens and is recorded", async () => {
    const superAdmin = await createSuperAdmin();
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 1000,
    });
    expect(period.status).toBe("DRAFT");
    const finalized = await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    expect(finalized.status).toBe("FINALIZED");
    expect(finalized.finalizedAt).not.toBeNull();
  });

  it("is idempotent: a second finalize call on the same period is refused, not a silent no-op success", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 5, new Date("2026-01-10T00:00:00Z"));
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 5000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    await expect(finalizeRevenuePeriod(actorOf(superAdmin), period.id)).rejects.toThrow(ValidationError);
  });

  it("works correctly for a period with zero eligible views", async () => {
    const superAdmin = await createSuperAdmin();
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 1000,
    });
    const finalized = await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    expect(finalized.status).toBe("FINALIZED");
    const payouts = await prisma.publisherPayout.findMany({ where: { revenuePeriodId: period.id } });
    expect(payouts).toHaveLength(0);
    const logs = await prisma.moderationLog.findMany({ where: { action: "FINALIZE_REVENUE_PERIOD" } });
    expect(logs.filter((l) => (l.metadata as { revenuePeriodId?: string } | null)?.revenuePeriodId === period.id)).toHaveLength(1);
  });

  it("HISTORICAL IMMUTABILITY: changing a publisher's share percentage after finalization does not alter the already-created payout", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher({ payoutSharePercentage: "40.0000" });
    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 10, new Date("2026-01-10T00:00:00Z"));
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payoutBefore = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
    expect(payoutBefore.sharePercentage.toString()).toBe("40");
    expect(payoutBefore.amountCents).toBe(4000); // 10000 * 100% views * 40%

    // Admin changes the publisher's rate AFTER the period was finalized.
    await setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, 90);

    const payoutAfter = await prisma.publisherPayout.findFirstOrThrow({ where: { id: payoutBefore.id } });
    expect(payoutAfter.sharePercentage.toString()).toBe("40"); // unchanged
    expect(payoutAfter.amountCents).toBe(4000); // unchanged
  });

  it("HISTORICAL IMMUTABILITY: a second revenue period for the same publisher uses the NEW percentage, without touching the first period's payout", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher({ payoutSharePercentage: "40.0000" });
    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 10, new Date("2026-01-10T00:00:00Z"));
    const periodJan = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), periodJan.id);
    const janPayout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: periodJan.id } });

    await setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, 90);
    await createEligibleViews(resource.id, 10, new Date("2026-02-10T00:00:00Z"));
    const periodFeb = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-02-01T00:00:00Z"),
      periodEnd: new Date("2026-03-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), periodFeb.id);
    const febPayout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: periodFeb.id } });

    expect(febPayout.sharePercentage.toString()).toBe("90");
    expect(febPayout.amountCents).toBe(9000);

    // January's payout is untouched by February's finalize.
    const janPayoutRecheck = await prisma.publisherPayout.findUniqueOrThrow({ where: { id: janPayout.id } });
    expect(janPayoutRecheck.sharePercentage.toString()).toBe("40");
    expect(janPayoutRecheck.amountCents).toBe(4000);
  });
});
