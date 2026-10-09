import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createPublisher, createSuperAdmin, createResource, createEligibleViews, createRevenuePeriod, fakeCcpInput, actorOf } from "../setup/factories";
import { submitPayoutAccount, verifyPayoutAccount } from "@/server/services/payout-account.service";
import { finalizeRevenuePeriod } from "@/server/services/revenue-period.service";
import { approvePayout, markPayoutPaid, markPayoutFailed } from "@/server/services/payout.service";
import { ValidationError } from "@/server/services/resource.service";

/**
 * Sets up one real, finalized payout with a VERIFIED payout account
 * attached — the minimum real state needed to exercise every
 * transition. This goes through the actual service functions (submit,
 * verify, finalize), not a hand-crafted DB row, so a bug in any of those
 * upstream steps would also surface here.
 */
async function setupPendingPayout() {
  const superAdmin = await createSuperAdmin();
  const { user: publisher } = await createPublisher();
  await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
  const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
  await verifyPayoutAccount(actorOf(superAdmin), account.id);

  const resource = await createResource({ uploadedById: publisher.id });
  const periodStart = new Date("2026-01-01T00:00:00Z");
  const periodEnd = new Date("2026-02-01T00:00:00Z");
  await createEligibleViews(resource.id, 10, new Date("2026-01-15T00:00:00Z"));

  const period = await createRevenuePeriod({
    createdById: superAdmin.id,
    periodStart,
    periodEnd,
    totalRevenueCents: 100_00,
  });
  await finalizeRevenuePeriod(actorOf(superAdmin), period.id);

  const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
  return { superAdmin, publisher, payout };
}

describe("payout state machine", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("allows PENDING -> APPROVED", async () => {
    const { superAdmin, payout } = await setupPendingPayout();
    const updated = await approvePayout(actorOf(superAdmin), payout.id);
    expect(updated.status).toBe("APPROVED");
    expect(updated.approvedById).toBe(superAdmin.id);
    expect(updated.approvedAt).not.toBeNull();
  });

  it("allows PENDING -> FAILED", async () => {
    const { superAdmin, payout } = await setupPendingPayout();
    const updated = await markPayoutFailed(actorOf(superAdmin), payout.id, "invalid account details");
    expect(updated.status).toBe("FAILED");
    expect(updated.failureReason).toBe("invalid account details");
  });

  it("allows APPROVED -> PAID", async () => {
    const { superAdmin, payout } = await setupPendingPayout();
    await approvePayout(actorOf(superAdmin), payout.id);
    const paid = await markPayoutPaid(actorOf(superAdmin), payout.id, { transactionReference: "CCP-TEST-0001" });
    expect(paid.status).toBe("PAID");
    expect(paid.transactionReference).toBe("CCP-TEST-0001");
    expect(paid.paidAt).not.toBeNull();
  });

  it("allows APPROVED -> FAILED", async () => {
    const { superAdmin, payout } = await setupPendingPayout();
    await approvePayout(actorOf(superAdmin), payout.id);
    const failed = await markPayoutFailed(actorOf(superAdmin), payout.id, "CCP transfer bounced");
    expect(failed.status).toBe("FAILED");
  });

  // ---- Invalid transitions: every one of these MUST throw ----

  it("rejects PAID -> PENDING (re-approving a PAID payout must fail, since no operation moves status backward)", async () => {
    const { superAdmin, payout } = await setupPendingPayout();
    await approvePayout(actorOf(superAdmin), payout.id);
    await markPayoutPaid(actorOf(superAdmin), payout.id, { transactionReference: "REF-1" });
    await expect(approvePayout(actorOf(superAdmin), payout.id)).rejects.toThrow(ValidationError);
  });

  it("rejects PAID -> APPROVED (re-approving an already-PAID payout)", async () => {
    const { superAdmin, payout } = await setupPendingPayout();
    await approvePayout(actorOf(superAdmin), payout.id);
    await markPayoutPaid(actorOf(superAdmin), payout.id, { transactionReference: "REF-2" });
    await expect(approvePayout(actorOf(superAdmin), payout.id)).rejects.toThrow(ValidationError);
    const row = await prisma.publisherPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(row.status).toBe("PAID");
  });

  it("rejects PAID -> FAILED", async () => {
    const { superAdmin, payout } = await setupPendingPayout();
    await approvePayout(actorOf(superAdmin), payout.id);
    await markPayoutPaid(actorOf(superAdmin), payout.id, { transactionReference: "REF-3" });
    await expect(markPayoutFailed(actorOf(superAdmin), payout.id, "trying to fail a paid payout")).rejects.toThrow(ValidationError);
    const row = await prisma.publisherPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(row.status).toBe("PAID");
  });

  it("rejects FAILED -> PAID", async () => {
    const { superAdmin, payout } = await setupPendingPayout();
    await markPayoutFailed(actorOf(superAdmin), payout.id, "bad account");
    await expect(
      markPayoutPaid(actorOf(superAdmin), payout.id, { transactionReference: "SHOULD-NOT-APPLY" }),
    ).rejects.toThrow(ValidationError);
    const row = await prisma.publisherPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(row.status).toBe("FAILED");
    expect(row.transactionReference).toBeNull();
  });

  it("rejects FAILED -> APPROVED", async () => {
    const { superAdmin, payout } = await setupPendingPayout();
    await markPayoutFailed(actorOf(superAdmin), payout.id, "bad account");
    await expect(approvePayout(actorOf(superAdmin), payout.id)).rejects.toThrow(ValidationError);
  });

  it("rejects APPROVED -> PENDING (re-running approve on an APPROVED payout must fail)", async () => {
    const { superAdmin, payout } = await setupPendingPayout();
    await approvePayout(actorOf(superAdmin), payout.id);
    await expect(approvePayout(actorOf(superAdmin), payout.id)).rejects.toThrow(ValidationError);
    const row = await prisma.publisherPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(row.status).toBe("APPROVED");
  });

  it("a PAID payout's amount and transactionReference cannot be changed by any later call", async () => {
    const { superAdmin, payout } = await setupPendingPayout();
    await approvePayout(actorOf(superAdmin), payout.id);
    const paid = await markPayoutPaid(actorOf(superAdmin), payout.id, { transactionReference: "ORIGINAL-REF" });

    await expect(
      markPayoutPaid(actorOf(superAdmin), payout.id, { transactionReference: "TAMPERED-REF" }),
    ).rejects.toThrow(ValidationError);

    const row = await prisma.publisherPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(row.transactionReference).toBe("ORIGINAL-REF");
    expect(row.amountCents).toBe(paid.amountCents);
  });

  it("approvePayout refuses a payout whose account is not VERIFIED", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
    // deliberately no verifyPayoutAccount call

    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 5, new Date("2026-01-10T00:00:00Z"));
    const period = await createRevenuePeriod({
      createdById: superAdmin.id,
      periodStart: new Date("2026-01-01T00:00:00Z"),
      periodEnd: new Date("2026-02-01T00:00:00Z"),
      totalRevenueCents: 5000,
    });
    await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });

    expect(payout.payoutAccountId).toBeNull(); // unverified account never gets auto-attached
    await expect(approvePayout(actorOf(superAdmin), payout.id)).rejects.toThrow(ValidationError);
  });
});
