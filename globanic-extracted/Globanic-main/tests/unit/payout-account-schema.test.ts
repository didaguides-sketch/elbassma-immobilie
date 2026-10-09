import { describe, it, expect } from "vitest";
import { ccpPayoutAccountSchema, rejectPayoutAccountSchema, buildMaskedPreview } from "@/lib/validation/payout-account.schema";

describe("CCP payout account schema validation", () => {
  const validBase = {
    method: "CCP_BARIDIMOB" as const,
    legalFullName: "Test Publisher FAKE",
    country: "DZ" as const,
    ccpAccountNumber: "1234567890",
    ccpKey: "12",
    rip: "007999991234567890",
  };

  it("accepts a fully valid CCP submission", () => {
    const result = ccpPayoutAccountSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects a malformed CCP account number (letters)", () => {
    const result = ccpPayoutAccountSchema.safeParse({ ...validBase, ccpAccountNumber: "12A4567890" });
    expect(result.success).toBe(false);
  });

  it("rejects a CCP account number that's too short", () => {
    const result = ccpPayoutAccountSchema.safeParse({ ...validBase, ccpAccountNumber: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects a CCP account number that's too long", () => {
    const result = ccpPayoutAccountSchema.safeParse({ ...validBase, ccpAccountNumber: "123456789012" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed key (not exactly 2 digits)", () => {
    expect(ccpPayoutAccountSchema.safeParse({ ...validBase, ccpKey: "1" }).success).toBe(false);
    expect(ccpPayoutAccountSchema.safeParse({ ...validBase, ccpKey: "123" }).success).toBe(false);
    expect(ccpPayoutAccountSchema.safeParse({ ...validBase, ccpKey: "AB" }).success).toBe(false);
  });

  it("rejects a malformed RIP (wrong length)", () => {
    const result = ccpPayoutAccountSchema.safeParse({ ...validBase, rip: "12345" });
    expect(result.success).toBe(false);
  });

  it("accepts a missing/empty RIP (optional field)", () => {
    const { rip, ...rest } = validBase;
    void rip;
    expect(ccpPayoutAccountSchema.safeParse(rest).success).toBe(true);
    expect(ccpPayoutAccountSchema.safeParse({ ...validBase, rip: "" }).success).toBe(true);
  });

  it("rejects an empty or too-short legal full name", () => {
    expect(ccpPayoutAccountSchema.safeParse({ ...validBase, legalFullName: "" }).success).toBe(false);
    expect(ccpPayoutAccountSchema.safeParse({ ...validBase, legalFullName: "A" }).success).toBe(false);
  });

  it("rejects a wrong method literal (defense against a crafted request)", () => {
    const result = ccpPayoutAccountSchema.safeParse({ ...validBase, method: "PAYPAL" });
    expect(result.success).toBe(false);
  });

  it("buildMaskedPreview never includes the full CCP number", () => {
    const preview = buildMaskedPreview(validBase);
    expect(preview).toContain("7890"); // last 4 digits only
    expect(preview).not.toContain("123456"); // not the leading digits
  });
});

describe("reject-payout-account schema", () => {
  it("requires a non-trivial rejection reason", () => {
    expect(rejectPayoutAccountSchema.safeParse({ payoutAccountId: "abc", rejectionReason: "" }).success).toBe(false);
    expect(rejectPayoutAccountSchema.safeParse({ payoutAccountId: "abc", rejectionReason: "no" }).success).toBe(false);
    expect(rejectPayoutAccountSchema.safeParse({ payoutAccountId: "abc", rejectionReason: "بيانات غير صحيحة" }).success).toBe(true);
  });

  it("requires payoutAccountId", () => {
    expect(rejectPayoutAccountSchema.safeParse({ payoutAccountId: "", rejectionReason: "valid reason" }).success).toBe(false);
  });
});
