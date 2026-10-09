import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  createPublisher,
  createSuperAdmin,
  createResource,
  createResourceView,
  createRevenuePeriod,
  actorOf,
} from "../setup/factories";
import { finalizeRevenuePeriod } from "@/server/services/revenue-period.service";

describe("AdSense / fraud safety — revenue eligibility", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("self-access views generate zero revenue", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    const resource = await createResource({ uploadedById: publisher.id });
    const at = new Date("2026-01-10T00:00:00Z");
    // 50 self-views (isEligible false, isSelfAccess true) + 1 real eligible view
    for (let i = 0; i < 50; i += 1) {
      await createResourceView({ resourceId: resource.id, isEligible: false, isSelfAccess: true, createdAt: at });
    }
    await createResourceView({ resourceId: resource.id, isEligible: true, createdAt: at });

    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
    expect(payout.eligibleViews).toBe(1); // the 50 self-views contributed nothing
  });

  it("staff (ADMIN/SUPER_ADMIN) access views generate zero revenue", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    const resource = await createResource({ uploadedById: publisher.id });
    const at = new Date("2026-01-10T00:00:00Z");
    for (let i = 0; i < 20; i += 1) {
      await createResourceView({ resourceId: resource.id, isEligible: false, isStaffAccess: true, createdAt: at });
    }
    await createResourceView({ resourceId: resource.id, isEligible: true, createdAt: at });

    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
    expect(payout.eligibleViews).toBe(1);
  });

  it("bot-flagged views generate zero revenue", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    const resource = await createResource({ uploadedById: publisher.id });
    const at = new Date("2026-01-10T00:00:00Z");
    for (let i = 0; i < 100; i += 1) {
      await createResourceView({ resourceId: resource.id, isEligible: false, isBot: true, createdAt: at });
    }
    await createResourceView({ resourceId: resource.id, isEligible: true, createdAt: at });

    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
    expect(payout.eligibleViews).toBe(1); // a bot flooding a resource with 100 hits earns the publisher nothing extra
  });

  it("duplicate (deduped) views generate zero additional revenue", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    const resource = await createResource({ uploadedById: publisher.id });
    const at = new Date("2026-01-10T00:00:00Z");
    await createResourceView({ resourceId: resource.id, isEligible: true, createdAt: at });
    for (let i = 0; i < 10; i += 1) {
      await createResourceView({ resourceId: resource.id, isEligible: false, isDuplicate: true, createdAt: at });
    }

    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
    expect(payout.eligibleViews).toBe(1);
  });

  it("a mix of all fraud flags together: only the genuinely clean views count, nothing else, no partial credit", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    const resource = await createResource({ uploadedById: publisher.id });
    const at = new Date("2026-01-10T00:00:00Z");
    await createResourceView({ resourceId: resource.id, isEligible: false, isSelfAccess: true, createdAt: at });
    await createResourceView({ resourceId: resource.id, isEligible: false, isStaffAccess: true, createdAt: at });
    await createResourceView({ resourceId: resource.id, isEligible: false, isBot: true, createdAt: at });
    await createResourceView({ resourceId: resource.id, isEligible: false, isDuplicate: true, createdAt: at });
    // A view that is technically real but marked ineligible for some
    // other reason (isEligible=false with no specific flag set) must
    // also not count — isEligible is the single source of truth, not an
    // OR of the individual flags checked ad hoc by the test/consumer.
    await createResourceView({ resourceId: resource.id, isEligible: false, createdAt: at });
    await createResourceView({ resourceId: resource.id, isEligible: true, createdAt: at });
    await createResourceView({ resourceId: resource.id, isEligible: true, createdAt: at });

    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
    expect(payout.eligibleViews).toBe(2);
  });

  it("views outside the period window (before/after) are excluded even if eligible", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    const resource = await createResource({ uploadedById: publisher.id });
    await createResourceView({ resourceId: resource.id, isEligible: true, createdAt: new Date("2025-12-31T23:59:59Z") }); // before window
    await createResourceView({ resourceId: resource.id, isEligible: true, createdAt: new Date("2026-01-15T00:00:00Z") }); // inside window
    await createResourceView({ resourceId: resource.id, isEligible: true, createdAt: new Date("2026-02-01T00:00:00Z") }); // exactly at exclusive end boundary

    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 10000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
    expect(payout.eligibleViews).toBe(1); // only the Jan 15 view counts
  });
});
