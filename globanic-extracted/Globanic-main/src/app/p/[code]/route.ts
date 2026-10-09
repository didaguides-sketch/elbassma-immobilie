import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { getOrCreateAnalyticsSessionId } from "@/lib/utils/analytics-session";
import { applyReferralTouch } from "@/server/services/referral.service";

/**
 * Publisher referral entry point. Deliberately a redirect endpoint, not
 * a rendered page — see Phase 8.5 SEO strategy (no indexable content to
 * begin with). Never creates a ResourceView, never touches eligibility
 * or revenue — this route's only effect is reading/writing
 * ReferralAttribution state via applyReferralTouch, which is itself
 * fully transactional and safe under concurrency (see referral.service.ts).
 *
 * Fails safe on every error path: an invalid code, a revoked code, or
 * even an unexpected internal error all result in the same plain
 * redirect with no attribution applied and no details exposed — never a
 * stack trace, never a distinguishable error page (that would let
 * someone probe which codes exist).
 */
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const homeUrl = new URL("/", req.url);

  try {
    const sessionId = getOrCreateAnalyticsSessionId();
    const session = await auth();
    await applyReferralTouch(params.code, {
      sessionId,
      userId: session?.user?.id ?? null,
    });
  } catch {
    // Swallow — a referral touch failing must never surface to the
    // visitor as an error; it degrades to "no attribution applied",
    // which is always a safe, valid outcome.
  }

  return NextResponse.redirect(homeUrl, { status: 302 });
}
