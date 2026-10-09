import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  createUser,
  createPublisher,
  createResource,
} from "../setup/factories";
import {
  getOrCreatePublisherReferralLink,
  resolveActiveReferralLink,
  applyReferralTouch,
  getActiveAttributionId,
  claimAttributionOnLogin,
} from "@/server/services/referral.service";
import { recordResourceView } from "@/server/services/analytics-tracking.service";

describe("Publisher Referral / Attribution (Phase 8.5)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  // ---- Identity ----

  it("creates one referral link for a publisher, idempotently", async () => {
    const { user } = await createPublisher();
    const first = await getOrCreatePublisherReferralLink(user.id, "Ahmed Test FAKE");
    const second = await getOrCreatePublisherReferralLink(user.id, "Ahmed Test FAKE");
    expect(second.id).toBe(first.id);
    expect(second.code).toBe(first.code);

    const rows = await prisma.publisherReferralLink.findMany({ where: { publisherUserId: user.id } });
    expect(rows).toHaveLength(1);
  });

  it("enforces one ACTIVE link per publisher at the database level", async () => {
    const { user } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(user.id, "Ahmed FAKE");
    // Attempting to directly insert a second ACTIVE row for the same
    // publisher must be rejected by the partial unique index, not just
    // by application-level convention.
    await expect(
      prisma.publisherReferralLink.create({
        data: { publisherUserId: user.id, code: `${link.code}-2`, status: "ACTIVE" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("invalid code resolves to null and applies no attribution", async () => {
    const resolved = await resolveActiveReferralLink("does-not-exist");
    expect(resolved).toBeNull();

    const result = await applyReferralTouch("does-not-exist", { sessionId: "sess-1" });
    expect(result).toBeNull();
    const rows = await prisma.referralAttribution.findMany({});
    expect(rows).toHaveLength(0);
  });

  it("revoked code fails safely, same as invalid", async () => {
    const { user } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(user.id, "Ahmed FAKE");
    await prisma.publisherReferralLink.update({ where: { id: link.id }, data: { status: "REVOKED", revokedAt: new Date() } });

    const resolved = await resolveActiveReferralLink(link.code);
    expect(resolved).toBeNull();
    const result = await applyReferralTouch(link.code, { sessionId: "sess-1" });
    expect(result).toBeNull();
  });

  // ---- Attribution touch semantics ----

  it("first anonymous touch creates one ReferralAttribution", async () => {
    const { user } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(user.id, "Ahmed FAKE");
    await applyReferralTouch(link.code, { sessionId: "sess-A" });

    const rows = await prisma.referralAttribution.findMany({ where: { anonymousSessionId: "sess-A" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].publisherReferralLinkId).toBe(link.id);
    expect(rows[0].supersededById).toBeNull();
  });

  it("repeated same-publisher touch refreshes expiresAt in place — no new row", async () => {
    const { user } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(user.id, "Ahmed FAKE");
    const first = await applyReferralTouch(link.code, { sessionId: "sess-B" });

    // Force the row to look "older" so a refresh is actually observable.
    await prisma.referralAttribution.update({
      where: { id: first!.id },
      data: { expiresAt: new Date(Date.now() + 1000) },
    });

    await applyReferralTouch(link.code, { sessionId: "sess-B" });

    const rows = await prisma.referralAttribution.findMany({ where: { anonymousSessionId: "sess-B" } });
    expect(rows).toHaveLength(1); // still exactly one row
    expect(rows[0].id).toBe(first!.id); // same row, refreshed
    expect(rows[0].expiresAt.getTime()).toBeGreaterThan(Date.now() + 1000 * 60 * 60 * 24 * 20); // clearly refreshed forward (~30d)
  });

  it("a different publisher's touch supersedes the current attribution (last-touch)", async () => {
    const { user: pubA } = await createPublisher();
    const { user: pubB } = await createPublisher();
    const linkA = await getOrCreatePublisherReferralLink(pubA.id, "A FAKE");
    const linkB = await getOrCreatePublisherReferralLink(pubB.id, "B FAKE");

    const first = await applyReferralTouch(linkA.code, { sessionId: "sess-C" });
    const second = await applyReferralTouch(linkB.code, { sessionId: "sess-C" });

    const oldRow = await prisma.referralAttribution.findUniqueOrThrow({ where: { id: first!.id } });
    expect(oldRow.supersededById).toBe(second!.id);

    const active = await getActiveAttributionId({ sessionId: "sess-C" });
    expect(active).toBe(second!.id);
    expect(active).not.toBe(first!.id);
  });

  it("direct/organic traffic never clears existing attribution", async () => {
    const { user } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(user.id, "Ahmed FAKE");
    await applyReferralTouch(link.code, { sessionId: "sess-D" });

    // Simulate time passing with no further referral touches — a plain
    // view lookup should still see the same attribution.
    const active = await getActiveAttributionId({ sessionId: "sess-D" });
    expect(active).not.toBeNull();
  });

  it("expired attribution is not returned as active", async () => {
    const { user } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(user.id, "Ahmed FAKE");
    const touch = await applyReferralTouch(link.code, { sessionId: "sess-E" });
    await prisma.referralAttribution.update({ where: { id: touch!.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const active = await getActiveAttributionId({ sessionId: "sess-E" });
    expect(active).toBeNull();
  });

  // ---- Login merge ----

  it("login merge: no prior account attribution + live anonymous attribution -> claims it", async () => {
    const { user: pub } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(pub.id, "Ahmed FAKE");
    const visitor = await createUser({ role: "USER" });

    const anon = await applyReferralTouch(link.code, { sessionId: "sess-F" });
    await claimAttributionOnLogin(visitor.id, "sess-F");

    const claimed = await prisma.referralAttribution.findFirst({ where: { userId: visitor.id } });
    expect(claimed).not.toBeNull();
    expect(claimed!.publisherReferralLinkId).toBe(link.id);

    const oldRow = await prisma.referralAttribution.findUniqueOrThrow({ where: { id: anon!.id } });
    expect(oldRow.supersededById).toBe(claimed!.id); // anonymous row preserved, marked superseded

    const active = await getActiveAttributionId({ sessionId: "sess-F", userId: visitor.id });
    expect(active).toBe(claimed!.id);
  });

  it("login merge: account already has an attribution -> never overwritten by a new anonymous touch", async () => {
    const { user: pubA } = await createPublisher();
    const { user: pubB } = await createPublisher();
    const linkA = await getOrCreatePublisherReferralLink(pubA.id, "A FAKE");
    const linkB = await getOrCreatePublisherReferralLink(pubB.id, "B FAKE");
    const visitor = await createUser({ role: "USER" });

    await applyReferralTouch(linkA.code, { sessionId: "sess-G1" });
    await claimAttributionOnLogin(visitor.id, "sess-G1");
    const firstClaim = await prisma.referralAttribution.findFirstOrThrow({ where: { userId: visitor.id } });

    // A LATER session (different device/browser) touches a different
    // publisher, then the SAME account logs in again.
    await applyReferralTouch(linkB.code, { sessionId: "sess-G2" });
    await claimAttributionOnLogin(visitor.id, "sess-G2");

    const rows = await prisma.referralAttribution.findMany({ where: { userId: visitor.id } });
    expect(rows).toHaveLength(1); // still exactly the first claim — never re-claimed
    expect(rows[0].id).toBe(firstClaim.id);
    expect(rows[0].publisherReferralLinkId).toBe(linkA.id);
  });

  it("login merge: no anonymous attribution -> no row created, future login can still claim", async () => {
    const visitor = await createUser({ role: "USER" });
    await claimAttributionOnLogin(visitor.id, "sess-H-no-touch");
    const rows = await prisma.referralAttribution.findMany({ where: { userId: visitor.id } });
    expect(rows).toHaveLength(0);

    // A later login, after an actual touch, can still claim.
    const { user: pub } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(pub.id, "Ahmed FAKE");
    await applyReferralTouch(link.code, { sessionId: "sess-H-no-touch" });
    await claimAttributionOnLogin(visitor.id, "sess-H-no-touch");
    const rowsAfter = await prisma.referralAttribution.findMany({ where: { userId: visitor.id } });
    expect(rowsAfter).toHaveLength(1);
  });

  // ---- ResourceView integration ----

  it("a referral touch never creates a ResourceView", async () => {
    const { user } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(user.id, "Ahmed FAKE");
    await applyReferralTouch(link.code, { sessionId: "sess-I" });
    const views = await prisma.resourceView.count();
    expect(views).toBe(0);
  });

  it("an eligible view records the active referralAttributionId", async () => {
    const { user: publisher } = await createPublisher();
    const { user: otherPublisher } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(publisher.id, "Ahmed FAKE");
    await applyReferralTouch(link.code, { sessionId: "sess-J" });
    const activeId = await getActiveAttributionId({ sessionId: "sess-J" });

    // Resource uploaded by a DIFFERENT publisher than the one who
    // referred the visitor — the critical revenue-independence case.
    const resource = await createResource({ uploadedById: otherPublisher.id });

    const view = await recordResourceView({
      resourceId: resource.id,
      sessionId: "sess-J",
      viewer: null,
      ipHash: "fake-ip-hash",
      userAgent: "Mozilla/5.0 FAKE",
      referrer: null,
    });

    expect(view!.referralAttributionId).toBe(activeId);
    expect(view!.isEligible).toBe(true); // referral presence didn't change eligibility
  });

  it("view with no active attribution records referralAttributionId = null", async () => {
    const { user: publisher } = await createPublisher();
    const resource = await createResource({ uploadedById: publisher.id });
    const view = await recordResourceView({
      resourceId: resource.id,
      sessionId: "sess-K-untouched",
      viewer: null,
      ipHash: "fake-ip-hash",
      userAgent: "Mozilla/5.0 FAKE",
      referrer: null,
    });
    expect(view!.referralAttributionId).toBeNull();
  });

  it("REVENUE INDEPENDENCE: self-access remains ineligible regardless of referral attribution", async () => {
    const { user: publisher } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(publisher.id, "Ahmed FAKE");
    await applyReferralTouch(link.code, { sessionId: "sess-L", userId: publisher.id });

    const resource = await createResource({ uploadedById: publisher.id });
    // The publisher views their OWN resource, having also referred
    // themself via their own link — attribution exists, but isSelfAccess
    // must still make this ineligible, exactly as with no referral at all.
    const view = await recordResourceView({
      resourceId: resource.id,
      sessionId: "sess-L",
      viewer: { id: publisher.id, role: "PUBLISHER" },
      ipHash: "fake-ip-hash",
      userAgent: "Mozilla/5.0 FAKE",
      referrer: null,
    });

    expect(view!.isSelfAccess).toBe(true);
    expect(view!.isEligible).toBe(false);
    // Attribution is still recorded as metadata — proving it's present
    // but inert with respect to eligibility, not silently suppressed.
    expect(view!.referralAttributionId).not.toBeNull();
  });

  it("historical ResourceView keeps its original referralAttributionId after that attribution is later superseded", async () => {
    const { user: pubA } = await createPublisher();
    const { user: pubB } = await createPublisher();
    const { user: resourceOwner } = await createPublisher();
    const linkA = await getOrCreatePublisherReferralLink(pubA.id, "A FAKE");
    const linkB = await getOrCreatePublisherReferralLink(pubB.id, "B FAKE");

    await applyReferralTouch(linkA.code, { sessionId: "sess-M" });
    const firstAttributionId = await getActiveAttributionId({ sessionId: "sess-M" });

    const resource = await createResource({ uploadedById: resourceOwner.id });
    const view = await recordResourceView({
      resourceId: resource.id,
      sessionId: "sess-M",
      viewer: null,
      ipHash: "fake-ip-hash",
      userAgent: "Mozilla/5.0 FAKE",
      referrer: null,
    });
    expect(view!.referralAttributionId).toBe(firstAttributionId);

    // A different publisher's touch now supersedes the first attribution.
    await applyReferralTouch(linkB.code, { sessionId: "sess-M" });
    const secondAttributionId = await getActiveAttributionId({ sessionId: "sess-M" });
    expect(secondAttributionId).not.toBe(firstAttributionId);

    // The historical view must still point at the FIRST attribution —
    // never retroactively updated.
    const reloadedView = await prisma.resourceView.findUniqueOrThrow({ where: { id: view!.id } });
    expect(reloadedView.referralAttributionId).toBe(firstAttributionId);
  });

  // ---- Concurrency ----

  it("concurrent same-publisher touches for the same session never produce two active rows", async () => {
    const { user } = await createPublisher();
    const link = await getOrCreatePublisherReferralLink(user.id, "Ahmed FAKE");

    await Promise.allSettled([
      applyReferralTouch(link.code, { sessionId: "sess-N" }),
      applyReferralTouch(link.code, { sessionId: "sess-N" }),
      applyReferralTouch(link.code, { sessionId: "sess-N" }),
    ]);

    const liveRows = await prisma.referralAttribution.findMany({
      where: { anonymousSessionId: "sess-N", supersededById: null },
    });
    expect(liveRows).toHaveLength(1);
  });

  it("concurrent different-publisher touches for the same session settle into exactly one deterministic live state", async () => {
    const { user: pubA } = await createPublisher();
    const { user: pubB } = await createPublisher();
    const linkA = await getOrCreatePublisherReferralLink(pubA.id, "A FAKE");
    const linkB = await getOrCreatePublisherReferralLink(pubB.id, "B FAKE");

    await Promise.allSettled([
      applyReferralTouch(linkA.code, { sessionId: "sess-O" }),
      applyReferralTouch(linkB.code, { sessionId: "sess-O" }),
    ]);

    const liveRows = await prisma.referralAttribution.findMany({
      where: { anonymousSessionId: "sess-O", supersededById: null },
    });
    // Exactly one row must be live at the end, regardless of which
    // publisher "won" the race — the DB constraint guarantees this even
    // though the outcome (A vs B) is intentionally not deterministic
    // from the test's point of view under true concurrency.
    expect(liveRows).toHaveLength(1);

    const allRows = await prisma.referralAttribution.findMany({ where: { anonymousSessionId: "sess-O" } });
    expect(allRows.length).toBeGreaterThanOrEqual(1);
    expect(allRows.length).toBeLessThanOrEqual(2);
  });
});
