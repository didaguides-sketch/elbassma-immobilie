import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { can, ForbiddenError, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "./resource.service";

type Actor = { id: string; role: Role };

/**
 * Publisher revenue share, as a percentage stored in PublisherPayout.
 * sharePercentage (Decimal 7,4). This is the platform-wide fallback used
 * when a publisher has no PublisherProfile.payoutSharePercentage override
 * set — see resolveSharePercentage below and
 * setPublisherSharePercentageOverride to configure a specific publisher.
 */
const DEFAULT_PUBLISHER_SHARE_PERCENTAGE = new Prisma.Decimal("50.0000");

export async function createRevenuePeriod(
  actor: Actor,
  input: { label: string; periodStart: Date; periodEnd: Date; totalRevenueCents: number; currency?: string },
) {
  if (!can(actor.role, "revenue-period:manage")) throw new ForbiddenError();

  if (input.periodEnd <= input.periodStart) {
    throw new ValidationError("تاريخ نهاية الفترة يجب أن يكون بعد تاريخ البداية.");
  }
  if (!Number.isInteger(input.totalRevenueCents) || input.totalRevenueCents < 0) {
    throw new ValidationError("إجمالي الإيرادات يجب أن يكون رقمًا صحيحًا غير سالب (بالسنتيمات).");
  }

  return prisma.revenuePeriod.create({
    data: {
      label: input.label,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      totalRevenueCents: input.totalRevenueCents,
      currency: input.currency ?? "DZD",
      createdById: actor.id,
      status: "DRAFT",
    },
  });
}

export async function listRevenuePeriods(actor: Actor) {
  if (!can(actor.role, "revenue-period:manage")) throw new ForbiddenError();
  return prisma.revenuePeriod.findMany({
    orderBy: { periodStart: "desc" },
    include: { _count: { select: { payouts: true } } },
  });
}

type EligibleViewsRow = { publisherUserId: string; eligibleViews: bigint };

/**
 * Real per-publisher eligible-view counts for the period window, joined
 * from ResourceView -> Resource. Only isEligible=true rows count — the
 * same anti-fraud flag (excludes self-views, staff views, bot hits,
 * dedup'd duplicates) that already gates Resource.viewsCount elsewhere
 * in this app. Nothing here invents or estimates data; if there are zero
 * eligible views in the window, this returns an empty list and finalize
 * creates zero payouts.
 */
async function getEligibleViewsByPublisher(periodStart: Date, periodEnd: Date): Promise<EligibleViewsRow[]> {
  return prisma.$queryRaw<EligibleViewsRow[]>(Prisma.sql`
    SELECT r."uploadedById" AS "publisherUserId", COUNT(*)::bigint AS "eligibleViews"
    FROM "ResourceView" v
    JOIN "Resource" r ON r.id = v."resourceId"
    WHERE v."isEligible" = true
      AND v."createdAt" >= ${periodStart}
      AND v."createdAt" < ${periodEnd}
    GROUP BY r."uploadedById"
  `);
}

/**
 * Finalizing a period is a one-way action (DRAFT -> FINALIZED) that
 * snapshots real eligible-view counts into concrete PublisherPayout rows.
 * Re-finalizing an already-finalized period is refused rather than
 * silently recomputing — payouts may already be approved/paid by then,
 * and this app never mutates a payout's amount after creation (see
 * payout.service.ts transition rules).
 *
 * Amount formula per publisher (all Decimal arithmetic — see the
 * "Money math" comment inside this function for why, and for the
 * largest-remainder rounding that guarantees sum(amountCents) equals
 * the true Decimal-exact total owed to publishers, i.e. round(sum of
 * every publisher's raw share) — NOT totalRevenueCents, since publishers
 * only receive their sharePercentage of it):
 *   rawAmount_i  = totalRevenueCents * (eligibleViews_i / totalEligibleViews) * sharePercentage_i / 100
 *   amountCents_i = floor(rawAmount_i), then +1 to the N publishers with
 *                   the largest fractional remainders, where N is
 *                   whatever's left over after flooring everyone.
 *
 * If a publisher has designated a preferred payout account (see
 * setPreferredPayoutAccount) and it is currently active and VERIFIED, it's
 * attached automatically so the payout is immediately approvable — method-
 * agnostic since Phase 13.5B, not CCP-specific. Otherwise payoutAccountId
 * stays null and an admin must ask the publisher to submit + get a
 * verified account (and mark it preferred) before that specific payout
 * can move past PENDING (see payout.service.ts).
 */
export async function finalizeRevenuePeriod(actor: Actor, revenuePeriodId: string) {
  if (!can(actor.role, "revenue-period:finalize")) throw new ForbiddenError();

  const period = await prisma.revenuePeriod.findUnique({ where: { id: revenuePeriodId } });
  if (!period) throw new NotFoundError();
  if (period.status === "FINALIZED") {
    throw new ValidationError("تم إنهاء هذه الفترة المالية مسبقًا ولا يمكن إعادة إنهائها.");
  }

  const rows = await getEligibleViewsByPublisher(period.periodStart, period.periodEnd);
  const totalEligibleViews = rows.reduce((sum, r) => sum + Number(r.eligibleViews), 0);

  // Atomic guard against two concurrent finalize calls on the same
  // period: a plain findUnique-then-update (what this used to do) is a
  // classic check-then-act race — two admins clicking "finalize" at
  // nearly the same time could both pass the status check above before
  // either commits. updateMany with status: "DRAFT" in the WHERE clause
  // makes the transition itself the atomic check: at most one caller's
  // update can affect a row (Postgres serializes concurrent UPDATEs on
  // the same row), so exactly one gets count === 1 and proceeds: the
  // loser sees count === 0 and is told the period was already finalized
  // instead of silently double-processing it. This closes the gap that
  // used to exist specifically in the zero-eligible-views branch, where
  // no PublisherPayout unique constraint was around to catch a race.
  const claim = await prisma.revenuePeriod.updateMany({
    where: { id: revenuePeriodId, status: "DRAFT" },
    data: { status: "FINALIZED", finalizedAt: new Date() },
  });
  if (claim.count === 0) {
    throw new ValidationError("تم إنهاء هذه الفترة المالية للتو من قبل مشرف آخر.");
  }

  if (totalEligibleViews === 0) {
    // Legitimate outcome (a slow period), not an error — the period is
    // already finalized by the claim above; just log it.
    await prisma.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "FINALIZE_REVENUE_PERIOD",
        metadata: { revenuePeriodId, totalEligibleViews: 0, payoutsCreated: 0 },
      },
    });
    return prisma.revenuePeriod.findUniqueOrThrow({ where: { id: revenuePeriodId } });
  }

  const publisherIds = rows.map((r) => r.publisherUserId);
  // Phase 13.5B: method-agnostic selection. `preferred = true` is the
  // publisher's explicit choice of which account to use next (see
  // setPreferredPayoutAccount) — but it is NOT by itself sufficient:
  // a preferred account can have been deactivated or rejected after
  // being marked preferred (the flag is not eagerly cleared in those
  // paths — see the schema field's docblock), so `isActive` and
  // `verificationStatus: "VERIFIED"` are re-checked here at the moment
  // of selection, same as they always were. This replaces the previous
  // hardcoded `method: "CCP_BARIDIMOB"` filter — CCP is no longer
  // special-cased; any method a publisher has verified and marked
  // preferred is selected the same way.
  const activeVerifiedAccounts = await prisma.publisherPayoutAccount.findMany({
    where: {
      publisherUserId: { in: publisherIds },
      isActive: true,
      verificationStatus: "VERIFIED",
      preferred: true,
    },
  });
  const accountByPublisher = new Map(activeVerifiedAccounts.map((a) => [a.publisherUserId, a]));

  // Per-publisher override, if an admin has set one — NULL rows fall
  // back to DEFAULT_PUBLISHER_SHARE_PERCENTAGE (see resolveSharePercentage).
  const profiles = await prisma.publisherProfile.findMany({
    where: { userId: { in: publisherIds } },
    select: { userId: true, payoutSharePercentage: true },
  });
  const sharePercentageByPublisher = new Map(profiles.map((p) => [p.userId, p.payoutSharePercentage]));

  // ------------------------------------------------------------
  // Money math — Decimal throughout, no JS floating-point.
  //
  // rawShareCents_i = totalRevenueCents * (eligibleViews_i / totalEligibleViews) * sharePercentage_i / 100
  //
  // Computed with Prisma.Decimal (arbitrary-precision, base-10) rather
  // than `number`, since `number` is IEEE-754 binary floating point and
  // cannot represent most decimal fractions exactly — the classic
  // 0.1 + 0.2 !== 0.3 problem, which is unacceptable for money.
  //
  // Each publisher's raw amount is then floored to whole cents
  // (Decimal.floor, not Math.floor) rather than rounded independently,
  // and the leftover fractional cents from flooring (at most
  // rows.length - 1 cents, since each flooring loses less than 1 cent)
  // are handed out one cent at a time to the publishers with the
  // largest fractional remainder — the standard "largest remainder
  // method" for splitting a total into proportional integer parts. This
  // guarantees sum(amountCents) === round(sum(rawAmount_i)) exactly —
  // NOT totalRevenueCents in general (those are only equal when every
  // publisher's sharePercentage is 100; see the bugfix comment at the
  // reconciliation step below for the mistake this replaced). What IS
  // guaranteed regardless of share percentages: independent per-
  // publisher rounding would NOT guarantee even sum(amountCents) ===
  // round(sum(rawAmount_i)) — a set of independently-rounded shares can
  // drift from the true total, which is not acceptable for a payout
  // ledger.
  // ------------------------------------------------------------
  const totalRevenue = new Prisma.Decimal(period.totalRevenueCents);
  const totalEligibleViewsDecimal = new Prisma.Decimal(totalEligibleViews);

  const computed = rows.map((row) => {
    const eligibleViews = Number(row.eligibleViews);
    const sharePercentage = sharePercentageByPublisher.get(row.publisherUserId) ?? DEFAULT_PUBLISHER_SHARE_PERCENTAGE;
    const rawAmount = totalRevenue
      .mul(new Prisma.Decimal(eligibleViews))
      .div(totalEligibleViewsDecimal)
      .mul(sharePercentage)
      .div(100);
    const flooredCents = rawAmount.floor();
    const remainder = rawAmount.minus(flooredCents);
    return { row, eligibleViews, sharePercentage, flooredCents, remainder };
  });

  const distributedCents = computed.reduce((sum, c) => sum.plus(c.flooredCents), new Prisma.Decimal(0));
  // BUG FOUND WHILE BUILDING THE TEST SUITE (not caught by the earlier
  // audit): this used to reconcile against `totalRevenue` (the period's
  // FULL revenue), not against what's actually owed to publishers. Those
  // are only equal when every publisher's sharePercentage is 100 — in
  // the normal case (default 50%), summing the raw per-publisher amounts
  // gives roughly half of totalRevenueCents, while `totalRevenue` is the
  // whole amount. Reconciling flooring error against the wrong, much
  // larger total produced a `leftoverCents` far bigger than the number
  // of publishers in the period, so the largest-remainder loop below
  // (which can add at most 1 cent per publisher, bounded by array
  // length) ran out of iterations before `leftoverCents` reached 0 —
  // in practice this meant EVERY publisher silently received +1 cent
  // beyond what they were owed, on every single finalize. Small in
  // absolute terms, but systematically wrong money on every period.
  //
  // The correct reconciliation target is sum(rawAmount_i), i.e.
  // distributedCents + sum(remainder_i) — the sum of remainders' integer
  // part (rounded) is exactly how many extra whole cents are owed across
  // all publishers to make the floored total exact.
  const sumOfRemainders = computed.reduce((sum, c) => sum.plus(c.remainder), new Prisma.Decimal(0));
  let leftoverCents = sumOfRemainders.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
  // Hand out the leftover whole cents to the largest remainders first —
  // deterministic, and the total publisher payout always sums to
  // exactly totalRevenueCents (the platform never silently keeps or
  // loses cents to rounding, and never overpays).
  const byRemainderDesc = [...computed].sort((a, b) => b.remainder.comparedTo(a.remainder));
  const finalAmounts = new Map<string, Prisma.Decimal>();
  for (const c of computed) finalAmounts.set(c.row.publisherUserId, c.flooredCents);
  for (const c of byRemainderDesc) {
    if (leftoverCents <= 0) break;
    finalAmounts.set(c.row.publisherUserId, finalAmounts.get(c.row.publisherUserId)!.plus(1));
    leftoverCents -= 1;
  }

  const payoutCreates = computed.map(({ row, eligibleViews, sharePercentage }) => {
    const account = accountByPublisher.get(row.publisherUserId);
    const amountCents = finalAmounts.get(row.publisherUserId)!.toNumber();

    return prisma.publisherPayout.create({
      data: {
        revenuePeriodId,
        publisherUserId: row.publisherUserId,
        eligibleViews,
        totalEligibleViews,
        sharePercentage,
        amountCents,
        currency: period.currency,
        status: "PENDING",
        payoutAccountId: account?.id ?? null,
        payoutMethod: account?.method ?? null,
      },
    });
  });

  await prisma.$transaction([
    ...payoutCreates,
    prisma.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "FINALIZE_REVENUE_PERIOD",
        metadata: { revenuePeriodId, totalEligibleViews, payoutsCreated: payoutCreates.length },
      },
    }),
  ]);

  return prisma.revenuePeriod.findUniqueOrThrow({ where: { id: revenuePeriodId } });
}

/**
 * Sets (or clears, with percentage = null) a publisher's override of the
 * platform-default revenue share. Takes effect on the NEXT
 * finalizeRevenuePeriod call — never retroactively touches already-
 * created PublisherPayout rows, since those are a financial record of
 * what was actually calculated at the time.
 */
export async function setPublisherSharePercentageOverride(
  actor: Actor,
  publisherUserId: string,
  percentage: number | null,
) {
  // Same tier as finalize/reveal/payout:manage — this directly changes
  // how much money a publisher receives on the next finalize, so it
  // belongs with the other real-money-consequence actions, not with
  // routine period bookkeeping (revenue-period:manage).
  if (!can(actor.role, "revenue-period:finalize")) throw new ForbiddenError();

  if (percentage !== null && (percentage < 0 || percentage > 100 || Number.isNaN(percentage))) {
    throw new ValidationError("نسبة حصة الناشر يجب أن تكون بين 0 و100.");
  }

  const value = percentage === null ? null : new Prisma.Decimal(percentage.toFixed(4));

  const updated = await prisma.publisherProfile.update({
    where: { userId: publisherUserId },
    data: { payoutSharePercentage: value },
  });

  await prisma.moderationLog.create({
    data: {
      actorId: actor.id,
      action: "SET_PUBLISHER_SHARE_PERCENTAGE",
      metadata: { publisherUserId, payoutSharePercentage: percentage },
    },
  });

  return updated;
}
