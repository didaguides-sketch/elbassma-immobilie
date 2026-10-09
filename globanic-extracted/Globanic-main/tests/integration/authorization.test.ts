import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  createUser,
  createPublisher,
  createAdmin,
  createSuperAdmin,
  createResource,
  createEligibleViews,
  createRevenuePeriod,
  fakeCcpInput,
  actorOf,
} from "../setup/factories";
import { submitPayoutAccount, listOwnPayoutAccounts, verifyPayoutAccount, rejectPayoutAccount, revealPayoutAccountDetails, listPendingPayoutAccounts } from "@/server/services/payout-account.service";
import { createRevenuePeriod as createPeriodSvc, finalizeRevenuePeriod, setPublisherSharePercentageOverride } from "@/server/services/revenue-period.service";
import { approvePayout, markPayoutPaid, markPayoutFailed, listPayoutsForAdmin, listPublishersAwaitingPayment, getOwnEarnings } from "@/server/services/payout.service";
import { ForbiddenError } from "@/server/auth/rbac";

/** Full permission matrix, verified against the actual service functions. */
describe("authorization matrix", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("payout-account:submit", () => {
    it("plain USER cannot submit a payout account", async () => {
      const user = await createUser({ role: "USER" });
      await expect(submitPayoutAccount(actorOf(user), fakeCcpInput())).rejects.toThrow(ForbiddenError);
    });

    it("PUBLISHER can submit their own payout account", async () => {
      const { user: publisher } = await createPublisher();
      const result = await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
      expect(result.verificationStatus).toBe("PENDING_REVIEW");
    });
  });

  describe("publisher isolation — cannot see or reveal another publisher's account", () => {
    it("PUBLISHER's own list never includes another publisher's account", async () => {
      const { user: pubA } = await createPublisher();
      const { user: pubB } = await createPublisher();
      await submitPayoutAccount(actorOf({ ...pubA, role: "PUBLISHER" }), fakeCcpInput());
      await submitPayoutAccount(actorOf({ ...pubB, role: "PUBLISHER" }), fakeCcpInput({ legalFullName: "Publisher B FAKE" }));

      const listA = await listOwnPayoutAccounts(actorOf({ ...pubA, role: "PUBLISHER" }));
      expect(listA).toHaveLength(1);
      const listB = await listOwnPayoutAccounts(actorOf({ ...pubB, role: "PUBLISHER" }));
      expect(listB).toHaveLength(1);
      expect(listA[0].id).not.toBe(listB[0].id);
    });

    it("PUBLISHER cannot call revealPayoutAccountDetails at all, even for their own account", async () => {
      const { user: publisher } = await createPublisher();
      await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
      const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
      await expect(
        revealPayoutAccountDetails(actorOf({ ...publisher, role: "PUBLISHER" }), account.id),
      ).rejects.toThrow(ForbiddenError);
    });

    it("PUBLISHER cannot verify or reject any payout account, including their own", async () => {
      const { user: publisher } = await createPublisher();
      await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
      const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
      await expect(verifyPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), account.id)).rejects.toThrow(ForbiddenError);
      await expect(rejectPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), account.id, "no")).rejects.toThrow(ForbiddenError);
    });
  });

  describe("payout-account:reveal — SUPER_ADMIN only", () => {
    it("plain ADMIN cannot reveal raw CCP/RIP", async () => {
      const admin = await createAdmin();
      const { user: publisher } = await createPublisher();
      await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
      const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
      await expect(revealPayoutAccountDetails(actorOf(admin), account.id)).rejects.toThrow(ForbiddenError);
    });

    it("SUPER_ADMIN can reveal", async () => {
      const superAdmin = await createSuperAdmin();
      const { user: publisher } = await createPublisher();
      await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
      const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
      const revealed = await revealPayoutAccountDetails(actorOf(superAdmin), account.id);
      expect((revealed.details as { ccpAccountNumber?: string }).ccpAccountNumber).toBe("1234567890");
    });

    it("plain ADMIN CAN still verify/reject accounts (lower-sensitivity than reveal)", async () => {
      const admin = await createAdmin();
      const { user: publisher } = await createPublisher();
      await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
      const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
      const verified = await verifyPayoutAccount(actorOf(admin), account.id);
      expect(verified.verificationStatus).toBe("VERIFIED");
    });

    it("plain ADMIN can list the pending-review queue", async () => {
      const admin = await createAdmin();
      const { user: publisher } = await createPublisher();
      await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
      const pending = await listPendingPayoutAccounts(actorOf(admin));
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("payout:manage (approve / pay / fail) — SUPER_ADMIN only", () => {
    async function setupApprovablePayout() {
      const superAdmin = await createSuperAdmin();
      const { user: publisher } = await createPublisher();
      await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
      const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
      await verifyPayoutAccount(actorOf(superAdmin), account.id);
      const resource = await createResource({ uploadedById: publisher.id });
      await createEligibleViews(resource.id, 5, new Date("2026-01-10T00:00:00Z"));
      const period = await createPeriodSvc(actorOf(superAdmin), {
        label: "auth-test",
        periodStart: new Date("2026-01-01T00:00:00Z"),
        periodEnd: new Date("2026-02-01T00:00:00Z"),
        totalRevenueCents: 5000,
      });
      await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
      const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });
      return { superAdmin, publisher, payout };
    }

    it("plain ADMIN cannot approve a payout", async () => {
      const admin = await createAdmin();
      const { payout } = await setupApprovablePayout();
      await expect(approvePayout(actorOf(admin), payout.id)).rejects.toThrow(ForbiddenError);
    });

    it("plain ADMIN cannot mark a payout paid or failed", async () => {
      const admin = await createAdmin();
      const { superAdmin, payout } = await setupApprovablePayout();
      await approvePayout(actorOf(superAdmin), payout.id); // SUPER_ADMIN approves first
      await expect(markPayoutPaid(actorOf(admin), payout.id, { transactionReference: "X" })).rejects.toThrow(ForbiddenError);
      await expect(markPayoutFailed(actorOf(admin), payout.id, "reason")).rejects.toThrow(ForbiddenError);
    });

    it("SUPER_ADMIN can approve, then pay", async () => {
      const { superAdmin, payout } = await setupApprovablePayout();
      const approved = await approvePayout(actorOf(superAdmin), payout.id);
      expect(approved.status).toBe("APPROVED");
      const paid = await markPayoutPaid(actorOf(superAdmin), payout.id, { transactionReference: "REF-OK" });
      expect(paid.status).toBe("PAID");
    });

    it("PUBLISHER cannot approve their own payout", async () => {
      const { publisher, payout } = await setupApprovablePayout();
      await expect(approvePayout(actorOf({ ...publisher, role: "PUBLISHER" }), payout.id)).rejects.toThrow(ForbiddenError);
    });

    it("plain ADMIN can still VIEW the payouts queue (payout:view, distinct from payout:manage)", async () => {
      const admin = await createAdmin();
      await setupApprovablePayout();
      const list = await listPayoutsForAdmin(actorOf(admin));
      expect(Array.isArray(list)).toBe(true);
      const awaiting = await listPublishersAwaitingPayment(actorOf(admin));
      expect(Array.isArray(awaiting)).toBe(true);
    });

    it("plain USER cannot view the admin payouts queue", async () => {
      const user = await createUser({ role: "USER" });
      await expect(listPayoutsForAdmin(actorOf(user))).rejects.toThrow(ForbiddenError);
    });
  });

  describe("revenue-period:finalize — SUPER_ADMIN only (create is ADMIN-level)", () => {
    it("plain ADMIN can create a DRAFT period", async () => {
      const admin = await createAdmin();
      const period = await createPeriodSvc(actorOf(admin), {
        label: "admin-created",
        periodStart: new Date("2026-01-01T00:00:00Z"),
        periodEnd: new Date("2026-02-01T00:00:00Z"),
        totalRevenueCents: 1000,
      });
      expect(period.status).toBe("DRAFT");
    });

    it("plain ADMIN cannot finalize a period", async () => {
      const admin = await createAdmin();
      const period = await createPeriodSvc(actorOf(admin), {
        label: "admin-created-2",
        periodStart: new Date("2026-01-01T00:00:00Z"),
        periodEnd: new Date("2026-02-01T00:00:00Z"),
        totalRevenueCents: 1000,
      });
      await expect(finalizeRevenuePeriod(actorOf(admin), period.id)).rejects.toThrow(ForbiddenError);
    });

    it("SUPER_ADMIN can finalize", async () => {
      const superAdmin = await createSuperAdmin();
      const period = await createPeriodSvc(actorOf(superAdmin), {
        label: "sa-created",
        periodStart: new Date("2026-01-01T00:00:00Z"),
        periodEnd: new Date("2026-02-01T00:00:00Z"),
        totalRevenueCents: 1000,
      });
      const finalized = await finalizeRevenuePeriod(actorOf(superAdmin), period.id);
      expect(finalized.status).toBe("FINALIZED");
    });
  });

  describe("unauthenticated / cross-cutting", () => {
    it("getOwnEarnings requires a real PUBLISHER/ADMIN/SUPER_ADMIN role, not a plain USER", async () => {
      const user = await createUser({ role: "USER" });
      await expect(getOwnEarnings(actorOf(user))).rejects.toThrow(ForbiddenError);
    });

    it("getOwnEarnings for a publisher never includes another publisher's payouts", async () => {
      const superAdmin = await createSuperAdmin();
      const { user: pubA } = await createPublisher();
      const { user: pubB } = await createPublisher();
      const resA = await createResource({ uploadedById: pubA.id });
      const resB = await createResource({ uploadedById: pubB.id });
      const at = new Date("2026-01-10T00:00:00Z");
      await createEligibleViews(resA.id, 10, at);
      await createEligibleViews(resB.id, 10, at);
      const period = await createPeriodSvc(actorOf(superAdmin), {
        label: "isolation-test",
        periodStart: new Date("2026-01-01T00:00:00Z"),
        periodEnd: new Date("2026-02-01T00:00:00Z"),
        totalRevenueCents: 10000,
      });
      await finalizeRevenuePeriod(actorOf(superAdmin), period.id);

      const earningsA = await getOwnEarnings(actorOf({ ...pubA, role: "PUBLISHER" }));
      expect(earningsA.payouts).toHaveLength(1);
      const earningsB = await getOwnEarnings(actorOf({ ...pubB, role: "PUBLISHER" }));
      expect(earningsB.payouts).toHaveLength(1);
      expect(earningsA.payouts[0].id).not.toBe(earningsB.payouts[0].id);
    });
  });
});
