import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createPublisher, createAdmin, createSuperAdmin, actorOf } from "../setup/factories";
import { setPublisherSharePercentageOverride } from "@/server/services/revenue-period.service";
import { ForbiddenError } from "@/server/auth/rbac";
import { ValidationError } from "@/server/services/resource.service";

describe("publisher share percentage override", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("no override set: PublisherProfile.payoutSharePercentage is null (falls back to platform default at finalize time)", async () => {
    const { user, profile } = await createPublisher();
    expect(profile.payoutSharePercentage).toBeNull();
    void user;
  });

  it("SUPER_ADMIN can set an explicit override (e.g. 55%)", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, 55);
    const profile = await prisma.publisherProfile.findUniqueOrThrow({ where: { userId: publisher.id } });
    expect(profile.payoutSharePercentage?.toString()).toBe("55");
  });

  it("explicit null clears the override back to platform default", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher({ payoutSharePercentage: "55.0000" });
    await setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, null);
    const profile = await prisma.publisherProfile.findUniqueOrThrow({ where: { userId: publisher.id } });
    expect(profile.payoutSharePercentage).toBeNull();
  });

  it("explicit 0 is stored as a real zero, not cleared to null", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, 0);
    const profile = await prisma.publisherProfile.findUniqueOrThrow({ where: { userId: publisher.id } });
    expect(profile.payoutSharePercentage).not.toBeNull();
    expect(profile.payoutSharePercentage?.toString()).toBe("0");
  });

  it("100 is accepted", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, 100);
    const profile = await prisma.publisherProfile.findUniqueOrThrow({ where: { userId: publisher.id } });
    expect(profile.payoutSharePercentage?.toString()).toBe("100");
  });

  it("rejects negative values", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await expect(setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, -5)).rejects.toThrow(ValidationError);
  });

  it("rejects values above 100", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await expect(setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, 150)).rejects.toThrow(ValidationError);
  });

  it("rejects NaN", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await expect(setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, Number.NaN)).rejects.toThrow(ValidationError);
  });

  // ---- Authorization ----

  it("PUBLISHER cannot change their own share percentage", async () => {
    const { user: publisher } = await createPublisher();
    await expect(
      setPublisherSharePercentageOverride(actorOf({ ...publisher, role: "PUBLISHER" }), publisher.id, 90),
    ).rejects.toThrow(ForbiddenError);
    const profile = await prisma.publisherProfile.findUniqueOrThrow({ where: { userId: publisher.id } });
    expect(profile.payoutSharePercentage).toBeNull(); // unchanged
  });

  it("PUBLISHER cannot change another publisher's share percentage", async () => {
    const { user: attacker } = await createPublisher();
    const { user: victim } = await createPublisher();
    await expect(
      setPublisherSharePercentageOverride(actorOf({ ...attacker, role: "PUBLISHER" }), victim.id, 100),
    ).rejects.toThrow(ForbiddenError);
    const profile = await prisma.publisherProfile.findUniqueOrThrow({ where: { userId: victim.id } });
    expect(profile.payoutSharePercentage).toBeNull();
  });

  it("plain ADMIN cannot change share percentage (SUPER_ADMIN-only tier)", async () => {
    const admin = await createAdmin();
    const { user: publisher } = await createPublisher();
    await expect(setPublisherSharePercentageOverride(actorOf(admin), publisher.id, 90)).rejects.toThrow(ForbiddenError);
  });

  it("SET_PUBLISHER_SHARE_PERCENTAGE audit log is written on success", async () => {
    const superAdmin = await createSuperAdmin();
    const { user: publisher } = await createPublisher();
    await setPublisherSharePercentageOverride(actorOf(superAdmin), publisher.id, 77);
    const logs = await prisma.moderationLog.findMany({
      where: { action: "SET_PUBLISHER_SHARE_PERCENTAGE", actorId: superAdmin.id },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const metadata = logs[logs.length - 1].metadata as { publisherUserId?: string; payoutSharePercentage?: number };
    expect(metadata.publisherUserId).toBe(publisher.id);
    expect(metadata.payoutSharePercentage).toBe(77);
  });
});
