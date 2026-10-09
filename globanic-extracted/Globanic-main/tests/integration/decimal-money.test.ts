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
import { finalizeRevenuePeriod } from "@/server/services/revenue-period.service";

describe("decimal / money precision", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("sanity check: plain JS floating point really does fail for this exact shape of calculation", () => {
    // This isn't testing production code — it's establishing that the
    // problem this suite guards against is real, not hypothetical.
    expect(0.1 + 0.2).not.toBe(0.3);
    // A naive float-based three-way split of 100 cents at equal shares:
    const naiveThirds = [100 / 3, 100 / 3, 100 / 3];
    const naiveSum = naiveThirds[0] + naiveThirds[1] + naiveThirds[2];
    // Individually these are non-terminating in binary floating point;
    // Math.round on each independently does NOT guarantee the sum comes
    // back to 100 (this is exactly the failure mode largest-remainder
    // rounding is designed to avoid, at the point of application).
    const naiveRounded = naiveThirds.map(Math.round);
    // (This assertion documents the failure mode itself; it is not
    // asserting anything about production code.)
    expect(naiveRounded.reduce((a, b) => a + b, 0)).not.toBe(99); // 33+33+33 would visibly lose a cent
  });

  it("three-way split of an amount not divisible by 3: production output sums exactly, unlike independent rounding", async () => {
    const superAdmin = await createSuperAdmin();
    const pubs = await Promise.all([createPublisher(), createPublisher(), createPublisher()]);
    const at = new Date("2026-01-10T00:00:00Z");
    for (const { user } of pubs) {
      const res = await createResource({ uploadedById: user.id });
      await createEligibleViews(res.id, 1, at); // equal views -> equal thirds, the classic 1/3 case
    }
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 100, // 1.00 DZD split three ways at 50% share = ~16.67 cents raw each
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payouts = await prisma.publisherPayout.findMany({ where: { revenuePeriodId: period.id } });
    const sum = payouts.reduce((s, p) => s + p.amountCents, 0);

    // True amount owed to publishers collectively: 100 * 0.5 = 50 cents
    // exactly. Must reconcile exactly, not drift by even 1 cent.
    expect(sum).toBe(50);
    for (const p of payouts) {
      expect(Number.isInteger(p.amountCents)).toBe(true);
    }
  });

  it("SUM(all publisher payout amounts) equals the true Decimal-exact total across many uneven-share scenarios", async () => {
    // Regression test for the specific bug found while building this
    // suite: an earlier version reconciled leftover cents against
    // totalRevenueCents instead of against the sum actually owed to
    // publishers (which is smaller whenever any sharePercentage < 100).
    // That bug silently overpaid every publisher by 1 cent on every
    // finalize. This test would have failed against that version.
    const scenarios: Array<{ views: number[]; shares: number[]; totalCents: number }> = [
      { views: [1, 1], shares: [50, 50], totalCents: 10000 },
      { views: [30, 70], shares: [50, 50], totalCents: 10000 },
      { views: [1, 1, 1], shares: [50, 50, 50], totalCents: 100 },
      { views: [17, 33, 50], shares: [60, 60, 60], totalCents: 10007 },
      { views: [50, 50], shares: [30, 70], totalCents: 10000 },
      { views: [1], shares: [100], totalCents: 999 },
      { views: [1], shares: [0], totalCents: 999 },
    ];

    for (const scenario of scenarios) {
      await resetDb();
      const superAdmin = await createSuperAdmin();
      const at = new Date("2026-01-10T00:00:00Z");
      const publisherIds: string[] = [];
      for (let i = 0; i < scenario.views.length; i += 1) {
        const { user } = await createPublisher({ payoutSharePercentage: `${scenario.shares[i]}.0000` });
        publisherIds.push(user.id);
        const res = await createResource({ uploadedById: user.id });
        await createEligibleViews(res.id, scenario.views[i], at);
      }
      const period = await createRevenuePeriod({
        createdById: superAdmin.id,
        periodStart: new Date("2026-01-01T00:00:00Z"),
        periodEnd: new Date("2026-02-01T00:00:00Z"),
        totalRevenueCents: scenario.totalCents,
      });
      await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
      const payouts = await prisma.publisherPayout.findMany({ where: { revenuePeriodId: period.id } });
      const actualSum = payouts.reduce((s, p) => s + p.amountCents, 0);

      const totalViews = scenario.views.reduce((a, b) => a + b, 0);
      const trueExactSum = Math.round(
        scenario.views.reduce((s, v, i) => s + (scenario.totalCents * v * scenario.shares[i]) / (totalViews * 100), 0),
      );

      expect(actualSum).toBe(trueExactSum);
    }
  });
});
