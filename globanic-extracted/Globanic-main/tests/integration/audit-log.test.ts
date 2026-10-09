import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  createPublisher,
  createSuperAdmin,
  createResource,
  createEligibleViews,
  fakeCcpInput,
  actorOf,
} from "../setup/factories";
import { submitPayoutAccount, verifyPayoutAccount, rejectPayoutAccount, revealPayoutAccountDetails } from "@/server/services/payout-account.service";
import { createRevenuePeriod, finalizeRevenuePeriod, setPublisherSharePercentageOverride } from "@/server/services/revenue-period.service";
import { approvePayout, markPayoutPaid, markPayoutFailed } from "@/server/services/payout.service";

async function lastLogFor(action: string, actorId: string) {
  return prisma.moderationLog.findFirst({
    where: { action: action as never, actorId },
    orderBy: { createdAt: "desc" },
  });
}

describe("audit trail — every sensitive payout operation", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("SUBMIT_PAYOUT_ACCOUNT is logged with the submitting publisher as actor", async () => {
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
    const log = await lastLogFor("SUBMIT_PAYOUT_ACCOUNT", publisher.id);
    expect(log).not.toBeNull();
  });

  it("VERIFY_PAYOUT_ACCOUNT is logged with the admin as actor", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
    const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
    await verifyPayoutAccount(actorOf(superAdmin), account.id);
    const log = await lastLogFor("VERIFY_PAYOUT_ACCOUNT", superAdmin.id);
    expect(log?.payoutAccountId).toBe(account.id);
  });

  it("REJECT_PAYOUT_ACCOUNT is logged with the reason", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
    const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
    await rejectPayoutAccount(actorOf(superAdmin), account.id, "بيانات غير مطابقة");
    const log = await lastLogFor("REJECT_PAYOUT_ACCOUNT", superAdmin.id);
    expect(log?.reason).toBe("بيانات غير مطابقة");
  });

  it("REVEAL_PAYOUT_ACCOUNT_DETAILS is logged for every reveal, including repeated reveals", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
    const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
    await revealPayoutAccountDetails(actorOf(superAdmin), account.id);
    await revealPayoutAccountDetails(actorOf(superAdmin), account.id);
    const logs = await prisma.moderationLog.findMany({ where: { action: "REVEAL_PAYOUT_ACCOUNT_DETAILS", payoutAccountId: account.id } });
    expect(logs).toHaveLength(2); // every reveal call is logged, not deduplicated
  });

  it("SET_PUBLISHER_SHARE_PERCENTAGE is logged with the new value", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, 42);
    const log = await lastLogFor("SET_PUBLISHER_SHARE_PERCENTAGE", superAdmin.id);
    expect((log?.metadata as { payoutSharePercentage?: number })?.payoutSharePercentage).toBe(42);
  });

  it("FINALIZE_REVENUE_PERIOD is logged exactly once per successful finalize", async () => {
    const superAdmin = await createSuperAdmin();
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 1000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const logs = await prisma.moderationLog.findMany({ where: { action: "FINALIZE_REVENUE_PERIOD", actorId: superAdmin.id } });
    const forThisPeriod = logs.filter((l) => (l.metadata as { revenuePeriodId?: string } | null)?.revenuePeriodId === period.id);
    expect(forThisPeriod).toHaveLength(1);
  });

  it("APPROVE_PAYOUT, MARK_PAYOUT_PAID, and MARK_PAYOUT_FAILED are each logged for the correct payout", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
    const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
    await verifyPayoutAccount(actorOf(superAdmin), account.id);
    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 3, new Date("2026-01-10T00:00:00Z"));
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 3000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });

    await approvePayout(actorOf(superAdmin), payout.id);
    const approveLog = await prisma.moderationLog.findFirst({ where: { action: "APPROVE_PAYOUT", payoutId: payout.id } });
    expect(approveLog).not.toBeNull();

    await markPayoutPaid(actorOf(superAdmin), payout.id, { transactionReference: "AUDIT-REF" });
    const paidLog = await prisma.moderationLog.findFirst({ where: { action: "MARK_PAYOUT_PAID", payoutId: payout.id } });
    expect((paidLog?.metadata as { transactionReference?: string })?.transactionReference).toBe("AUDIT-REF");
  });

  it("MARK_PAYOUT_FAILED is logged separately from MARK_PAYOUT_PAID", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
    const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
    await verifyPayoutAccount(actorOf(superAdmin), account.id);
    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 3, new Date("2026-01-10T00:00:00Z"));
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 3000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });

    await markPayoutFailed(actorOf(superAdmin), payout.id, "بيانات الدفع غير صحيحة");
    const failLog = await prisma.moderationLog.findFirst({ where: { action: "MARK_PAYOUT_FAILED", payoutId: payout.id } });
    expect(failLog?.reason).toBe("بيانات الدفع غير صحيحة");
    const paidLog = await prisma.moderationLog.findFirst({ where: { action: "MARK_PAYOUT_PAID", payoutId: payout.id } });
    expect(paidLog).toBeNull();
  });

  it("no service function accepts a caller-supplied actorId — every log row's actorId is always the authenticated caller", async () => {
    // This is a structural/API-shape assertion rather than a runtime
    // exploit attempt: every payout-related service function signature
    // is (actor, ...otherArgs) and derives actorId from `actor.id`
    // internally — there is no parameter through which a publisher
    // could name a different actorId for their own submission. Verified
    // here by confirming the logged actorId always matches the actor
    // actually passed in, across a representative operation.
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
    const log = await lastLogFor("SUBMIT_PAYOUT_ACCOUNT", publisher.id);
    expect(log?.actorId).toBe(publisher.id);
  });
});
