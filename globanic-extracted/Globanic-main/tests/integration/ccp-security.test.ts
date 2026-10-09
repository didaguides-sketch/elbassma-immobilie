import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createPublisher, createSuperAdmin, fakeCcpInput, actorOf } from "../setup/factories";
import { submitPayoutAccount, revealPayoutAccountDetails, listOwnPayoutAccounts, listPendingPayoutAccounts } from "@/server/services/payout-account.service";
import { encryptPayoutDetails, decryptPayoutDetails } from "@/server/security/payout-encryption";

describe("CCP / RIP security", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("round-trip: encrypting then decrypting returns the exact original fake values", () => {
    const original = { ccpAccountNumber: "1234567890", ccpKey: "12", rip: "007999991234567890" };
    const { encryptedDetails, encryptionKeyVersion } = encryptPayoutDetails(original);
    expect(encryptedDetails).not.toContain("1234567890"); // ciphertext must not contain plaintext substrings
    const decrypted = decryptPayoutDetails<typeof original>(encryptedDetails, encryptionKeyVersion);
    expect(decrypted).toEqual(original);
  });

  it("stored PublisherPayoutAccount.encryptedDetails column never contains the plaintext CCP number", async () => {
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
    // Deliberately raw findFirst (bypassing the service's toSummary
    // allowlist) to inspect exactly what's on disk.
    const raw = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });
    expect(raw.encryptedDetails).not.toContain("1234567890");
    expect(raw.encryptedDetails).not.toContain("007999991234567890");
    expect(typeof raw.encryptedDetails).toBe("string");
    expect(raw.encryptedDetails.length).toBeGreaterThan(0);
  });

  it("listOwnPayoutAccounts and listPendingPayoutAccounts never expose encryptedDetails or plaintext fields", async () => {
    const admin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());

    const own = await listOwnPayoutAccounts(actorOf({ ...publisher, role: "PUBLISHER" }));
    expect(own).toHaveLength(1);
    expect(own[0]).not.toHaveProperty("encryptedDetails");
    expect(JSON.stringify(own[0])).not.toContain("1234567890");

    const pending = await listPendingPayoutAccounts(actorOf(admin));
    expect(JSON.stringify(pending)).not.toContain("1234567890");
    expect(JSON.stringify(pending)).not.toContain("encryptedDetails");
  });

  it("only a successful reveal call returns plaintext, and only to an authorized caller", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
    const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });

    const revealed = await revealPayoutAccountDetails(actorOf(superAdmin), account.id);
    expect((revealed.details as { ccpAccountNumber?: string }).ccpAccountNumber).toBe("1234567890");
  });

  it("reveal writes a REVEAL_PAYOUT_ACCOUNT_DETAILS audit record naming the actor and the account, without embedding plaintext in the log", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput());
    const account = await prisma.publisherPayoutAccount.findFirstOrThrow({ where: { publisherUserId: publisher.id } });

    await revealPayoutAccountDetails(actorOf(superAdmin), account.id);

    const logs = await prisma.moderationLog.findMany({
      where: { action: "REVEAL_PAYOUT_ACCOUNT_DETAILS", payoutAccountId: account.id },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].actorId).toBe(superAdmin.id);
    expect(JSON.stringify(logs[0].metadata)).not.toContain("1234567890"); // metadata is publisherUserId/method only
  });

  it("FAIL CLOSED: missing PAYOUT_ENCRYPTION_KEY causes submitPayoutAccount to throw, not fall back to plaintext storage", async () => {
    const { user: publisher } = await createPublisher();
    const original = process.env.PAYOUT_ENCRYPTION_KEY;
    delete process.env.PAYOUT_ENCRYPTION_KEY;
    try {
      await expect(
        submitPayoutAccount(actorOf({ ...publisher, role: "PUBLISHER" }), fakeCcpInput()),
      ).rejects.toThrow(/PAYOUT_ENCRYPTION_KEY/);
      // And crucially: no row was created at all — a half-written
      // plaintext-adjacent row would be just as bad as one.
      const rows = await prisma.publisherPayoutAccount.findMany({ where: { publisherUserId: publisher.id } });
      expect(rows).toHaveLength(0);
    } finally {
      process.env.PAYOUT_ENCRYPTION_KEY = original;
    }
  });

  it("FAIL CLOSED: a key that does not decode to exactly 32 bytes is rejected", () => {
    const original = process.env.PAYOUT_ENCRYPTION_KEY;
    process.env.PAYOUT_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    try {
      expect(() => encryptPayoutDetails({ ccpAccountNumber: "1", ccpKey: "1" })).toThrow(/32 bytes/);
    } finally {
      process.env.PAYOUT_ENCRYPTION_KEY = original;
    }
  });

  it("decrypting a tampered ciphertext fails loudly (AES-GCM auth tag) rather than returning wrong plaintext", () => {
    const { encryptedDetails, encryptionKeyVersion } = encryptPayoutDetails({ ccpAccountNumber: "1234567890" });
    const buf = Buffer.from(encryptedDetails, "base64");
    buf[buf.length - 1] ^= 0xff; // flip the last byte of the ciphertext
    const tampered = buf.toString("base64");
    expect(() => decryptPayoutDetails(tampered, encryptionKeyVersion)).toThrow();
  });
});
