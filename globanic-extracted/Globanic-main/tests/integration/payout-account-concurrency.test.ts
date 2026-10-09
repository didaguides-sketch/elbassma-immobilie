import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createPublisher, fakeCcpInput, actorOf } from "../setup/factories";
import { submitPayoutAccount } from "@/server/services/payout-account.service";
import { ValidationError } from "@/server/services/resource.service";

describe("payout account concurrency", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("two simultaneous submissions for the same publisher+method never leave two simultaneously-active accounts", async () => {
    const { user: publisher } = await createPublisher();
    const actor = actorOf({ ...publisher, role: "PUBLISHER" });

    const results = await Promise.allSettled([
      submitPayoutAccount(actor, fakeCcpInput({ legalFullName: "Race Submit A FAKE" })),
      submitPayoutAccount(actor, fakeCcpInput({ legalFullName: "Race Submit B FAKE" })),
    ]);

    // THE INVARIANT THAT ACTUALLY MATTERS: regardless of how many of the
    // two calls "succeeded" at the application level, the database must
    // never contain two simultaneously-active accounts for the same
    // publisher+method. This is what the partial unique index
    // (migration 20260907020000) exists to guarantee.
    const activeAccounts = await prisma.publisherPayoutAccount.findMany({
      where: { publisherUserId: publisher.id, method: "CCP_BARIDIMOB", isActive: true },
    });
    expect(activeAccounts).toHaveLength(1);

    // At least one call must have succeeded (the suite shouldn't lock
    // out a legitimate publisher entirely); if the other failed, it must
    // fail with a clean, typed, expected error — not a raw DB exception.
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    if (rejected.length > 0) {
      const reason = (rejected[0] as PromiseRejectedResult).reason;
      expect(reason).toBeInstanceOf(ValidationError);
    }
  });

  it("submitting for two DIFFERENT methods concurrently is unaffected by the same-method guard", async () => {
    // Sanity check that the partial unique index is scoped correctly
    // (per publisher+method, not per publisher alone) — not exercised by
    // the CCP-only test above since only one real method exists today,
    // but verified against the schema/index definition directly.
    const indexes = await prisma.$queryRawUnsafe<Array<{ indexdef: string }>>(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'PublisherPayoutAccount' AND indexname = 'PublisherPayoutAccount_one_active_per_publisher_method'`,
    );
    expect(indexes).toHaveLength(1);
    expect(indexes[0].indexdef).toContain("publisherUserId");
    expect(indexes[0].indexdef).toContain("method");
    expect(indexes[0].indexdef.toLowerCase()).toContain("isactive");
  });

  it("sequential resubmission (not concurrent) still correctly deactivates the old account", async () => {
    const { user: publisher } = await createPublisher();
    const actor = actorOf({ ...publisher, role: "PUBLISHER" });
    const first = await submitPayoutAccount(actor, fakeCcpInput({ legalFullName: "First FAKE" }));
    const second = await submitPayoutAccount(actor, fakeCcpInput({ legalFullName: "Second FAKE" }));

    const firstRow = await prisma.publisherPayoutAccount.findUniqueOrThrow({ where: { id: first.id } });
    const secondRow = await prisma.publisherPayoutAccount.findUniqueOrThrow({ where: { id: second.id } });
    expect(firstRow.isActive).toBe(false);
    expect(secondRow.isActive).toBe(true);

    const activeAccounts = await prisma.publisherPayoutAccount.findMany({
      where: { publisherUserId: publisher.id, method: "CCP_BARIDIMOB", isActive: true },
    });
    expect(activeAccounts).toHaveLength(1);
  });
});
