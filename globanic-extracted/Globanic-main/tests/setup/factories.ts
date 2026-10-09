import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/server/auth/rbac";
import type { CcpPayoutAccountInput } from "@/lib/validation/payout-account.schema";

/**
 * Truncates every table this test suite touches, in one statement so
 * CASCADE handles ordering. Called in beforeEach for isolation between
 * tests — never called against anything but TEST_DATABASE_URL (enforced
 * by tests/setup/env.ts before this file is ever imported).
 */
export async function resetDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ModerationLog",
      "PublisherPayout",
      "PublisherPayoutAccount",
      "RevenuePeriod",
      "ResourceView",
      "ResourceDownload",
      "ReferralAttribution",
      "PublisherReferralLink",
      "Resource",
      "PublisherProfile",
      "Profile",
      "User"
    CASCADE
  `);
}

let userCounter = 0;
function uniqueEmail(prefix: string) {
  userCounter += 1;
  return `${prefix}.${Date.now()}.${userCounter}@test.globanic.invalid`;
}

export async function createUser(overrides: { role?: Role; email?: string; status?: "ACTIVE" | "SUSPENDED" } = {}) {
  return prisma.user.create({
    data: {
      email: overrides.email ?? uniqueEmail("user"),
      role: overrides.role ?? "USER",
      status: overrides.status ?? "ACTIVE",
    },
  });
}

/** A PUBLISHER user with a PublisherProfile row (required for share-percentage tests). */
export async function createPublisher(overrides: { email?: string; payoutSharePercentage?: string | null } = {}) {
  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? uniqueEmail("publisher"),
      role: "PUBLISHER",
      status: "ACTIVE",
    },
  });
  const profile = await prisma.publisherProfile.create({
    data: {
      userId: user.id,
      payoutSharePercentage: overrides.payoutSharePercentage ?? undefined,
    },
  });
  return { user, profile };
}

export async function createAdmin(overrides: { email?: string } = {}) {
  return createUser({ role: "ADMIN", email: overrides.email });
}

export async function createSuperAdmin(overrides: { email?: string } = {}) {
  return createUser({ role: "SUPER_ADMIN", email: overrides.email });
}

let resourceCounter = 0;
/** Minimal PUBLISHED resource owned by `uploadedById` — enough to attach ResourceViews to. */
export async function createResource(input: { uploadedById: string; status?: string }) {
  resourceCounter += 1;
  const slug = `test-resource-${Date.now()}-${resourceCounter}`;
  return prisma.resource.create({
    data: {
      slug,
      type: "COURS",
      title: `Test Resource ${resourceCounter}`,
      status: (input.status as never) ?? "PUBLISHED",
      uploadedById: input.uploadedById,
    },
  });
}

/**
 * Creates a ResourceView row. Defaults to a genuinely eligible view
 * (real audience, not self/staff/bot/duplicate) — pass overrides to
 * construct the fraud-flag combinations under test.
 */
export async function createResourceView(input: {
  resourceId: string;
  isEligible?: boolean;
  isSelfAccess?: boolean;
  isStaffAccess?: boolean;
  isBot?: boolean;
  isDuplicate?: boolean;
  createdAt?: Date;
  userId?: string | null;
}) {
  return prisma.resourceView.create({
    data: {
      resourceId: input.resourceId,
      sessionId: crypto.randomUUID(),
      userId: input.userId ?? undefined,
      isEligible: input.isEligible ?? true,
      isSelfAccess: input.isSelfAccess ?? false,
      isStaffAccess: input.isStaffAccess ?? false,
      isBot: input.isBot ?? false,
      isDuplicate: input.isDuplicate ?? false,
      createdAt: input.createdAt ?? new Date(),
    },
  });
}

/** Creates N eligible views for a resource, spread across a time window if given. */
export async function createEligibleViews(resourceId: string, count: number, at?: Date) {
  for (let i = 0; i < count; i += 1) {
    await createResourceView({ resourceId, isEligible: true, createdAt: at });
  }
}

export async function createRevenuePeriod(input: {
  createdById: string;
  periodStart: Date;
  periodEnd: Date;
  totalRevenueCents: number;
  currency?: string;
}) {
  return prisma.revenuePeriod.create({
    data: {
      label: `Test Period ${input.periodStart.toISOString()}`,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      totalRevenueCents: input.totalRevenueCents,
      currency: input.currency ?? "DZD",
      createdById: input.createdById,
      status: "DRAFT",
    },
  });
}

/**
 * Obviously-fake CCP/Baridi Mob test input — never real personal banking
 * information. "1234567890" / "12" / an 18-digit placeholder RIP.
 */
export function fakeCcpInput(overrides: Partial<CcpPayoutAccountInput> = {}): CcpPayoutAccountInput {
  return {
    method: "CCP_BARIDIMOB",
    legalFullName: "Test Publisher FAKE",
    country: "DZ",
    ccpAccountNumber: "1234567890",
    ccpKey: "12",
    rip: "007999991234567890",
    ...overrides,
  };
}

export function actorOf(user: { id: string; role: Role }) {
  return { id: user.id, role: user.role };
}
