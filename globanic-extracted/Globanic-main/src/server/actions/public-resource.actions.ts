"use server";

import { headers } from "next/headers";
import { auth } from "@/server/auth/auth.config";
import { recordResourceView, qualifyResourceView } from "@/server/services/analytics-tracking.service";
import { getOrCreateAnalyticsSessionId } from "@/lib/utils/analytics-session";
import { getClientIpHashFromHeaderGetter } from "@/lib/utils/request-ip";

/**
 * Called once per page load by <ResourceViewTracker> on the public
 * resource page. This is the only legitimate trigger for a "view" in the
 * whole app — see analytics-tracking.service.ts for why PDF/cover access
 * and admin review are deliberately excluded.
 *
 * Returns the created view's id (and whether it counted at all) so the
 * client can later confirm dwell time via qualifyViewAction — never null
 * silently swallowed, since the caller needs the id to follow up.
 */
export async function recordViewAction(
  resourceId: string,
): Promise<{ viewId: string; isEligible: boolean } | null> {
  try {
    const session = await auth();
    const actor = session?.user ? { id: session.user.id, role: session.user.role } : null;

    const headerList = headers();
    const sessionId = getOrCreateAnalyticsSessionId();

    const view = await recordResourceView({
      resourceId,
      viewer: actor,
      sessionId,
      ipHash: getClientIpHashFromHeaderGetter((name) => headerList.get(name)),
      userAgent: headerList.get("user-agent"),
      referrer: headerList.get("referer"),
    });

    if (!view) return null;
    return { viewId: view.id, isEligible: view.isEligible };
  } catch (error) {
    // Never let tracking failure surface to the visitor.
    // eslint-disable-next-line no-console
    console.error("[public-resource.actions] view tracking failed:", error);
    return null;
  }
}

/**
 * Called by <ResourceViewTracker> after the visitor has stayed on the
 * page long enough (MINIMUM_DWELL_SECONDS_FOR_PAYOUT). Marks the view
 * as dwell-qualified — a prerequisite for it ever counting toward a
 * publisher payout later.
 */
export async function qualifyViewAction(viewId: string): Promise<void> {
  try {
    await qualifyResourceView(viewId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[public-resource.actions] view qualification failed:", error);
  }
}
