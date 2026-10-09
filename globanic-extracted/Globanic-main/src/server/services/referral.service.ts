import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { toAdvisoryLockKey } from "@/lib/utils/advisory-lock";

const ATTRIBUTION_WINDOW_DAYS = 30;

function newExpiry(): Date {
  return new Date(Date.now() + ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

// ------------------------------------------------------------
// REFERRAL LINK IDENTITY
// ------------------------------------------------------------

function slugifyBase(name: string): string {
  const ascii = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return ascii.slice(0, 16) || "publisher";
}

/**
 * Publisher-facing codes are auto-generated (from their display name +
 * a short random suffix for uniqueness) rather than freely user-chosen
 * text in this pass — the approved architecture calls for a permanent,
 * human-shareable identity, not necessarily a fully custom one, and a
 * free-text slug would need its own validation/moderation UI that isn't
 * part of this scope. Still short, still readable, still safe to speak
 * aloud or print.
 */
async function generateUniqueCode(base: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 2 + (attempt === 0 ? 3 : 5));
    const candidate = `${base}${suffix}`;
    const existing = await prisma.publisherReferralLink.findUnique({ where: { code: candidate } });
    if (!existing) return candidate;
  }
  // Astronomically unlikely to be reached given the attempt count above,
  // but never loop forever — surface a clear error instead.
  throw new Error("تعذّر إنشاء رمز إحالة فريد. حاول مرة أخرى.");
}

/**
 * Idempotent: returns the publisher's current ACTIVE link if one exists,
 * otherwise creates one. Never returns two different codes for the same
 * publisher across repeated calls while a link is ACTIVE — the DB's
 * partial unique index (one ACTIVE row per publisher) is the actual
 * guarantee; this function just makes the common case not need a
 * separate "do you already have one" check from every caller.
 */
export async function getOrCreatePublisherReferralLink(publisherUserId: string, displayNameForCode: string) {
  const existing = await prisma.publisherReferralLink.findFirst({
    where: { publisherUserId, status: "ACTIVE" },
  });
  if (existing) return existing;

  const base = slugifyBase(displayNameForCode);
  const code = await generateUniqueCode(base);

  try {
    return await prisma.publisherReferralLink.create({
      data: { publisherUserId, code, status: "ACTIVE" },
    });
  } catch (error) {
    // A concurrent request already created this publisher's ACTIVE link
    // (caught by the partial unique index) — re-read and return it
    // rather than surfacing a spurious error for a benign race.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await prisma.publisherReferralLink.findFirst({
        where: { publisherUserId, status: "ACTIVE" },
      });
      if (winner) return winner;
    }
    throw error;
  }
}

/** Read-only resolution used by the /p/[code] route. Null for anything not currently ACTIVE — invalid and revoked codes are indistinguishable to the caller, by design (see Phase 8.5 security model: fail safely, no information leakage either way). */
export async function resolveActiveReferralLink(code: string) {
  return prisma.publisherReferralLink.findFirst({ where: { code, status: "ACTIVE" } });
}

// ------------------------------------------------------------
// ATTRIBUTION — read path (used by view recording)
// ------------------------------------------------------------

/**
 * The only function the analytics-tracking insert point calls. Read-only,
 * no writes, no side effects — safe to call unconditionally from inside
 * recordResourceView without affecting its transaction semantics.
 * Prefers userId when the viewer is authenticated (an account's
 * attribution, once claimed at login, is authoritative over whatever an
 * anonymous cookie on the same request might separately say).
 */
export async function getActiveAttributionId(params: { sessionId: string; userId?: string | null }): Promise<string | null> {
  const now = new Date();
  const where: Prisma.ReferralAttributionWhereInput = params.userId
    ? { userId: params.userId, supersededById: null, expiresAt: { gt: now } }
    : { anonymousSessionId: params.sessionId, supersededById: null, expiresAt: { gt: now } };

  const row = await prisma.referralAttribution.findFirst({ where, select: { id: true } });
  return row?.id ?? null;
}

// ------------------------------------------------------------
// ATTRIBUTION — write path (the /p/[code] touch)
// ------------------------------------------------------------

/**
 * The transactional core of a referral touch. Called from the /p/[code]
 * route handler. Never creates a ResourceView. Never touches revenue,
 * payout, or eligibility tables — this function's entire write surface
 * is PublisherReferralLink (read-only here) and ReferralAttribution.
 *
 * Concurrency: guarded by a Postgres advisory lock keyed on the
 * session/user identity, exactly like recordResourceView's existing
 * dedup guard — two near-simultaneous touches for the same visitor
 * serialize through this lock rather than racing to both read "no live
 * attribution" and both attempt to create one (which the DB's partial
 * unique index would then reject for the loser anyway, but the lock
 * avoids that error path entirely by making the check-then-act atomic).
 *
 * If `userId` is provided (the visitor is currently logged in when they
 * click the link), attribution is written directly against the account
 * — not the anonymous session — since an authenticated visitor's
 * referral touch should update their durable, cross-device attribution
 * immediately, the same way any other authenticated touch would.
 */
export async function applyReferralTouch(code: string, identity: { sessionId: string; userId?: string | null }) {
  const link = await resolveActiveReferralLink(code);
  if (!link) return null; // invalid/revoked code — safe no-op, no attribution created

  const lockKeyValue = identity.userId ? `referral-user:${identity.userId}` : `referral-session:${identity.sessionId}`;
  const lockKey = toAdvisoryLockKey(lockKeyValue);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    const identityWhere: Prisma.ReferralAttributionWhereInput = identity.userId
      ? { userId: identity.userId, supersededById: null }
      : { anonymousSessionId: identity.sessionId, supersededById: null };

    const current = await tx.referralAttribution.findFirst({ where: identityWhere });

    if (!current) {
      // No live attribution at all — first touch for this identity.
      return tx.referralAttribution.create({
        data: {
          publisherReferralLinkId: link.id,
          anonymousSessionId: identity.userId ? undefined : identity.sessionId,
          userId: identity.userId ?? undefined,
          expiresAt: newExpiry(),
        },
      });
    }

    if (current.publisherReferralLinkId === link.id) {
      // Same publisher touching again — refresh the sliding window in
      // place. Never a new row: this is a state refresh, not an event.
      return tx.referralAttribution.update({
        where: { id: current.id },
        data: { expiresAt: newExpiry() },
      });
    }

    // Different publisher — last-touch supersession. The OLD row is
    // marked superseded (pointing forward), a NEW row becomes live.
    // Both writes happen in this same transaction; the partial unique
    // index guarantees no window where two live rows coexist for this
    // identity, even under concurrent attempts.
    const next = await tx.referralAttribution.create({
      data: {
        publisherReferralLinkId: link.id,
        anonymousSessionId: identity.userId ? undefined : identity.sessionId,
        userId: identity.userId ?? undefined,
        expiresAt: newExpiry(),
      },
    });
    await tx.referralAttribution.update({
      where: { id: current.id },
      data: { supersededById: next.id },
    });
    return next;
  });
}

// ------------------------------------------------------------
// ATTRIBUTION — login merge
// ------------------------------------------------------------

/**
 * Called once, from the client-side login success handler (see
 * LoginForm.tsx), never from inside Auth.js's own callbacks — this is a
 * deliberate integration boundary so nothing in auth.config.ts changes.
 *
 * Algorithm (exactly as approved):
 *   1. Does ANY ReferralAttribution already exist for this userId
 *      (live, superseded, or expired — existence alone, not freshness)?
 *      If yes: stop. The account's attribution lineage is permanent;
 *      the current anonymous session's value is discarded.
 *   2. If no: does the anonymous session have a currently live
 *      (non-superseded, non-expired) attribution? If yes, create a NEW
 *      row with userId set, pointing at the SAME publisher link, and
 *      mark the anonymous row as superseded by it — preserving the
 *      anonymous row's history rather than deleting or mutating it in
 *      place. If no: do nothing; a future login can still claim later,
 *      since no account-level row was ever created here.
 *
 * Transactional: the existence check and the (conditional) write happen
 * inside one transaction, guarded by the same advisory-lock pattern, so
 * a login racing against a concurrent referral touch for the same
 * session cannot observe or produce a half-written state.
 */
export async function claimAttributionOnLogin(userId: string, sessionId: string): Promise<void> {
  const lockKey = toAdvisoryLockKey(`referral-user:${userId}`);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    const alreadyHasLineage = await tx.referralAttribution.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (alreadyHasLineage) return; // permanent — never re-claimed

    const now = new Date();
    const anonymousLive = await tx.referralAttribution.findFirst({
      where: { anonymousSessionId: sessionId, supersededById: null, expiresAt: { gt: now } },
    });
    if (!anonymousLive) return; // nothing to claim; a later login may still claim

    const claimed = await tx.referralAttribution.create({
      data: {
        publisherReferralLinkId: anonymousLive.publisherReferralLinkId,
        userId,
        expiresAt: anonymousLive.expiresAt,
      },
    });
    await tx.referralAttribution.update({
      where: { id: anonymousLive.id },
      data: { supersededById: claimed.id },
    });
  });
}
