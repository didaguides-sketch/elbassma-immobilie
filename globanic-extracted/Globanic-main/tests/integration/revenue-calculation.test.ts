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

/**
 * Independent reference implementation of the expected largest-remainder
 * distribution, using JS `Decimal`-free integer/fraction math via plain
 * number division but computed the same way a spreadsheet would, then
 * cross-checked. This exists so the test isn't just re-running the
 * production formula against itself — it's a second, independently
 * written calculation of the expected answer.
 */
function expectedAmounts(totalRevenueCents: number, viewsAndShares: Array<{ views: number; sharePct: number }>) {
  const totalViews = viewsAndShares.reduce((s, x) => s + x.views, 0);
  const raw = viewsAndShares.map((x) => (totalRevenueCents * x.views * x.sharePct) / (totalViews * 100));
  const floored = raw.map((r) => Math.floor(r + 1e-9)); // tiny epsilon guards against binary fp representation only, not used for the actual comparison values
  const remainders = raw.map((r, i) => r - floored[i]);
  let leftover = Math.round(remainders.reduce((a, b) => a + b, 0));
  const order = remainders.map((r, i) => i).sort((a, b) => remainders[b] - remainders[a]);
  const finalAmounts = [...floored];
  for (const i of order) {
    if (leftover <= 0) break;
    finalAmounts[i] += 1;
    leftover -= 1;
  }
  return finalAmounts;
}

describe("revenue calculation", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("0 eligible views: finalize succeeds with zero payouts, period still becomes FINALIZED", async () => {
    const superAdmin = await createSuperAdmin();
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    const finalized = await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    expect(finalized.status).toBe("FINALIZED");
    const payouts = await prisma.publisherPayout.findMany({ where: { revenuePeriodId: period.id } });
    expect(payouts).toHaveLength(0);
  });

  it("1 eligible view, single publisher, default 50% share", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 1, new Date("2026-01-10T00:00:00Z"));
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
    expect(payout.eligibleViews).toBe(1);
    expect(payout.totalEligibleViews).toBe(1);
    expect(payout.amountCents).toBe(expectedAmounts(10000, [{ views: 1, sharePct: 50 }])[0]);
    expect(payout.amountCents).toBe(5000); // sole publisher with 100% of views at 50% share = exactly half
  });

  it("multiple publishers with different eligible-view counts split proportionally", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: pubA } = await createPublisher();
    const { user: pubB } = await createPublisher();
    const { user: pubC } = await createPublisher();
    const resA = await createResource({ uploadedById: pubA.id });
    const resB = await createResource({ uploadedById: pubB.id });
    const resC = await createResource({ uploadedById: pubC.id });
    const at = new Date("2026-01-10T00:00:00Z");
    await createEligibleViews(resA.id, 10, at);
    await createEligibleViews(resB.id, 30, at);
    await createEligibleViews(resC.id, 60, at);

    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);

    const payouts = await prisma.publisherPayout.findMany({ where: { revenuePeriodId: period.id } });
    expect(payouts).toHaveLength(3);

    const byPublisher = new Map(payouts.map((p) => [p.publisherUserId, p]));
    const expected = expectedAmounts(10000, [
      { views: 10, sharePct: 50 },
      { views: 30, sharePct: 50 },
      { views: 60, sharePct: 50 },
    ]);
    expect(byPublisher.get(pubA.id)!.amountCents).toBe(expected[0]);
    expect(byPublisher.get(pubB.id)!.amountCents).toBe(expected[1]);
    expect(byPublisher.get(pubC.id)!.amountCents).toBe(expected[2]);

    // Sum must equal the true amount owed (50% of total here, since all
    // three share the platform default) — NOT totalRevenueCents itself.
    const sum = payouts.reduce((s, p) => s + p.amountCents, 0);
    expect(sum).toBe(expected.reduce((a, b) => a + b, 0));
    expect(sum).toBe(5000);
  });

  it("publisher-specific share percentages (30% vs 70%) change the split even with equal views", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: pubA } = await createPublisher({ payoutSharePercentage: "30.0000" });
    const { user: pubB } = await createPublisher({ payoutSharePercentage: "70.0000" });
    const resA = await createResource({ uploadedById: pubA.id });
    const resB = await createResource({ uploadedById: pubB.id });
    const at = new Date("2026-01-10T00:00:00Z");
    await createEligibleViews(resA.id, 50, at);
    await createEligibleViews(resB.id, 50, at);

    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payouts = await prisma.publisherPayout.findMany({ where: { revenuePeriodId: period.id } });
    const byPublisher = new Map(payouts.map((p) => [p.publisherUserId, p]));

    // Equal views (50/50) but unequal share % — B must receive more than A.
    expect(byPublisher.get(pubA.id)!.amountCents).toBe(1500); // 10000 * 0.5 * 0.30
    expect(byPublisher.get(pubB.id)!.amountCents).toBe(3500); // 10000 * 0.5 * 0.70
    expect(byPublisher.get(pubB.id)!.amountCents).toBeGreaterThan(byPublisher.get(pubA.id)!.amountCents);
  });

  it("null share percentage falls back to the platform default (50%)", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher({ payoutSharePercentage: null });
    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 1, new Date("2026-01-10T00:00:00Z"));
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
    expect(payout.sharePercentage.toString()).toBe("50");
    expect(payout.amountCents).toBe(5000);
  });

  it("explicit 0% override results in exactly zero payout, distinct from no override", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, 0);
    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 1, new Date("2026-01-10T00:00:00Z"));
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
    expect(payout.sharePercentage.toString()).toBe("0");
    expect(payout.amountCents).toBe(0);
  });

  it("60% and 100% overrides compute the correct absolute amounts", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: pub60 } = await createPublisher();
    await setPublisherSharePercentageOverride(actorOf(superAdmin), pub60.id, 60);
    const { user: pub100 } = await createPublisher();
    await setPublisherSharePercentageOverride(actorOf(superAdmin), pub100.id, 100);
    const res60 = await createResource({ uploadedById: pub60.id });
    const res100 = await createResource({ uploadedById: pub100.id });
    const at = new Date("2026-01-10T00:00:00Z");
    await createEligibleViews(res60.id, 50, at);
    await createEligibleViews(res100.id, 50, at);

    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 20000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payouts = await prisma.publisherPayout.findMany({ where: { revenuePeriodId: period.id } });
    const byPublisher = new Map(payouts.map((p) => [p.publisherUserId, p]));

    expect(byPublisher.get(pub60.id)!.amountCents).toBe(6000); // 20000 * 0.5 * 0.60
    expect(byPublisher.get(pub100.id)!.amountCents).toBe(10000); // 20000 * 0.5 * 1.00
  });

  it("rounding case: revenue not evenly divisible across uneven view counts still reconciles exactly", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: pubA } = await createPublisher();
    const { user: pubB } = await createPublisher();
    const { user: pubC } = await createPublisher();
    const resA = await createResource({ uploadedById: pubA.id });
    const resB = await createResource({ uploadedById: pubB.id });
    const resC = await createResource({ uploadedById: pubC.id });
    const at = new Date("2026-01-10T00:00:00Z");
    await createEligibleViews(resA.id, 17, at);
    await createEligibleViews(resB.id, 33, at);
    await createEligibleViews(resC.id, 50, at);

    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10007, // deliberately not evenly divisible
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payouts = await prisma.publisherPayout.findMany({ where: { revenuePeriodId: period.id } });
    const sum = payouts.reduce((s, p) => s + p.amountCents, 0);
    const expected = expectedAmounts(10007, [
      { views: 17, sharePct: 50 },
      { views: 33, sharePct: 50 },
      { views: 50, sharePct: 50 },
    ]);
    expect(sum).toBe(expected.reduce((a, b) => a + b, 0));
    // Every individual amount is a non-negative integer number of cents.
    for (const p of payouts) {
      expect(Number.isInteger(p.amountCents)).toBe(true);
      expect(p.amountCents).toBeGreaterThanOrEqual(0);
    }
  });

  it("very small revenue amount (1 cent) distributed among many publishers: no negative amounts, sum still correct", async () => {
    const superAdmin = await createSuperAdmin();
    const publishers = await Promise.all(Array.from({ length: 5 }, () => createPublisher()));
    const at = new Date("2026-01-10T00:00:00Z");
    for (const { user } of publishers) {
      const res = await createResource({ uploadedById: user.id });
      await createEligibleViews(res.id, 1, at);
    }
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 1,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payouts = await prisma.publisherPayout.findMany({ where: { revenuePeriodId: period.id } });
    for (const p of payouts) {
      expect(p.amountCents).toBeGreaterThanOrEqual(0);
    }
    const sum = payouts.reduce((s, p) => s + p.amountCents, 0);
    // 1 cent total * 50% share = 0.5 cent owed collectively -> rounds to
    // either 0 or 1 cent total, never more.
    expect(sum).toBeLessThanOrEqual(1);
  });

  it("large revenue amount (10,000,000.00 DZD) still reconciles exactly with no drift", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: pubA } = await createPublisher();
    const { user: pubB } = await createPublisher();
    const resA = await createResource({ uploadedById: pubA.id });
    const resB = await createResource({ uploadedById: pubB.id });
    const at = new Date("2026-01-10T00:00:00Z");
    await createEligibleViews(resA.id, 777, at);
    await createEligibleViews(resB.id, 223, at);

    const totalRevenueCents = 1_000_000_000; // 10,000,000.00 DZD
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payouts = await prisma.publisherPayout.findMany({ where: { revenuePeriodId: period.id } });
    const sum = payouts.reduce((s, p) => s + p.amountCents, 0);
    const expected = expectedAmounts(totalRevenueCents, [
      { views: 777, sharePct: 50 },
      { views: 223, sharePct: 50 },
    ]);
    expect(sum).toBe(expected.reduce((a, b) => a + b, 0));
    expect(sum).toBe(500_000_000); // exactly half a billion cents, no drift
  });
});
