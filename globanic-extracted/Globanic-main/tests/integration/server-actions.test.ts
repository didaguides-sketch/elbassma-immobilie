import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createPublisher, createAdmin, createSuperAdmin, createResource, createEligibleViews } from "../setup/factories";

/**
 * These exercise the exported Server Action functions themselves (not
 * the underlying service functions directly, which are covered
 * elsewhere) — i.e. this is what actually runs when a form submits or a
 * client component calls one of these. auth() is mocked per-test to
 * simulate different sessions; everything below it (service layer,
 * database) is real.
 */
vi.mock("@/server/auth/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("REDIRECT_CALLED");
  }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/server/auth/auth";
import { submitCcpPayoutAccountAction } from "@/server/actions/publisher-payout-account.actions";
import {
  verifyPayoutAccountAction,
  rejectPayoutAccountAction,
  revealPayoutAccountDetailsAction,
  approvePayoutAction,
  markPayoutPaidAction,
  markPayoutFailedAction,
} from "@/server/actions/admin-payout.actions";

function mockSession(user: { id: string; role: string } | null) {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(user ? { user } : null);
}

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("server actions", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("submitCcpPayoutAccountAction: unauthenticated user is redirected, not given a normal error", async () => {
    mockSession(null);
    await expect(
      submitCcpPayoutAccountAction({ success: false }, formData({ legalFullName: "X", ccpAccountNumber: "1234567890", ccpKey: "12" })),
    ).rejects.toThrow("REDIRECT_CALLED");
  });

  it("submitCcpPayoutAccountAction: malformed CCP number returns a typed field error, not a thrown exception", async () => {
    const { user: publisher } = await createPublisher();
    mockSession({ id: publisher.id, role: "PUBLISHER" });
    const result = await submitCcpPayoutAccountAction(
      { success: false },
      formData({ legalFullName: "Valid Name", ccpAccountNumber: "abc", ccpKey: "12" }),
    );
    expect(result.success).toBe(false);
    expect(result.errors?.ccpAccountNumber).toBeDefined();
  });

  it("submitCcpPayoutAccountAction: valid submission succeeds and is persisted", async () => {
    const { user: publisher } = await createPublisher();
    mockSession({ id: publisher.id, role: "PUBLISHER" });
    const result = await submitCcpPayoutAccountAction(
      { success: false },
      formData({ legalFullName: "Valid Name FAKE", ccpAccountNumber: "1234567890", ccpKey: "12", rip: "" }),
    );
    expect(result.success).toBe(true);
    const rows = await prisma.publisherPayoutAccount.findMany({ where: { publisherUserId: publisher.id } });
    expect(rows).toHaveLength(1);
  });

  it("verifyPayoutAccountAction: nonexistent payout account ID returns a clean typed error, not a raw exception", async () => {
    const superAdmin = await createSuperAdmin();
    mockSession({ id: superAdmin.id, role: "SUPER_ADMIN" });
    const result = await verifyPayoutAccountAction("does-not-exist-id");
    expect(result.success).toBe(false);
    expect(typeof result.message).toBe("string");
  });

  it("verifyPayoutAccountAction: unauthorized PUBLISHER caller gets a clean forbidden message, no crash", async () => {
    const { user: publisher } = await createPublisher();
    mockSession({ id: publisher.id, role: "PUBLISHER" });
    const result = await verifyPayoutAccountAction("any-id");
    expect(result.success).toBe(false);
  });

  it("revealPayoutAccountDetailsAction: unauthorized caller returns a typed failure result, never throws", async () => {
    const { user: publisher } = await createPublisher();
    mockSession({ id: publisher.id, role: "PUBLISHER" });
    const result = await revealPayoutAccountDetailsAction("any-id");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.message).toBe("string");
    }
  });

  it("revealPayoutAccountDetailsAction: plain ADMIN is refused (SUPER_ADMIN-only)", async () => {
    const admin = await createAdmin();
    const { user: publisher } = await createPublisher();
    mockSession({ id: publisher.id, role: "PUBLISHER" });
    await submitCcpPayoutAccountAction({ success: false }, formData({ legalFullName: "X FAKE", ccpAccountNumber: "1234567890", ccpKey: "12" }));
    const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });

    mockSession({ id: admin.id, role: "ADMIN" });
    const result = await revealPayoutAccountDetailsAction(account.id);
    expect(result.success).toBe(false);
  });

  it("approvePayoutAction: invalid/nonexistent payout ID returns a typed error", async () => {
    const superAdmin = await createSuperAdmin();
    mockSession({ id: superAdmin.id, role: "SUPER_ADMIN" });
    const result = await approvePayoutAction("nonexistent-payout-id");
    expect(result.success).toBe(false);
  });

  it("markPayoutPaidAction: missing payoutId returns a typed error without touching the DB", async () => {
    const superAdmin = await createSuperAdmin();
    mockSession({ id: superAdmin.id, role: "SUPER_ADMIN" });
    const result = await markPayoutPaidAction({ success: false }, formData({ transactionReference: "REF" }));
    expect(result.success).toBe(false);
  });

  it("repeated submission (double form submit) of the same valid CCP data is safe — second call supersedes, does not crash or duplicate active rows", async () => {
    const { user: publisher } = await createPublisher();
    mockSession({ id: publisher.id, role: "PUBLISHER" });
    const fd = formData({ legalFullName: "Repeat Test FAKE", ccpAccountNumber: "1234567890", ccpKey: "12" });
    const first = await submitCcpPayoutAccountAction({ success: false }, fd);
    const second = await submitCcpPayoutAccountAction({ success: false }, fd);
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    const active = await prisma.publisherPayoutAccount.findMany({ where: { publisherUserId: publisher.id, isActive: true } });
    expect(active).toHaveLength(1);
  });

  it("rejectPayoutAccountAction: empty rejection reason returns a typed field error", async () => {
    const superAdmin = await createSuperAdmin();
    mockSession({ id: superAdmin.id, role: "SUPER_ADMIN" });
    const result = await rejectPayoutAccountAction({ success: false }, formData({ payoutAccountId: "x", rejectionReason: "" }));
    expect(result.success).toBe(false);
    expect(result.errors?.rejectionReason).toBeDefined();
  });

  it("markPayoutFailedAction on a valid PENDING payout as SUPER_ADMIN succeeds cleanly", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    mockSession({ id: publisher.id, role: "PUBLISHER" });
    await submitCcpPayoutAccountAction({ success: false }, formData({ legalFullName: "X FAKE", ccpAccountNumber: "1234567890", ccpKey: "12" }));
    const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });

    mockSession({ id: superAdmin.id, role: "SUPER_ADMIN" });
    await verifyPayoutAccountAction(account.id);

    const resource = await createResource({ uploadedById: publisher.id });
    await createEligibleViews(resource.id, 4, new Date("2026-01-10T00:00:00Z"));
    const period = await prisma.revenuePeriod.create({
      data: {
        label: "server-action-test",
        periodStart: new Date("2026-01-01T00:00:00Z"),
        periodEnd: new Date("2026-02-01T00:00:00Z"),
        totalRevenueCents: 4000,
        createdById: superAdmin.id,
        status: "DRAFT",
      },
    });
    const { finalizeRevenuePeriod } = await import("@/server/services/revenue-period.service");
    await finalizeRevenuePeriod({ id: superAdmin.id, role: "SUPER_ADMIN" }, period.id);
    const payout = await prisma.publisherPayout.findFirstOrThrow({ where: { revenuePeriodId: period.id } });

    const result = await markPayoutFailedAction({ success: false }, formData({ payoutId: payout.id, failureReason: "بيانات خاطئة" }));
    expect(result.success).toBe(true);
    const row = await prisma.publisherPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(row.status).toBe("FAILED");
  });
});
