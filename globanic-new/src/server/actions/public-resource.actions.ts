"use server";

import { headers } from "next/headers";
import { auth } from "@/server/auth/auth.config";
import { recordResourceView } from "@/server/services/analytics-tracking.service";
import { getOrCreateAnalyticsSessionId } from "@/lib/utils/analytics-session";
import { getClientIpHashFromHeaderGetter } from "@/lib/utils/request-ip";

/**
 * Called once per page load by <ResourceViewTracker> on the public
 * resource page. This is the only legitimate trigger for a "view" in the
 * whole app — see analytics-tracking.service.ts for why PDF/cover access
 * and admin review are deliberately excluded.
 */
export async function recordViewAction(resourceId: string): Promise<void> {
  try {
    const session = await auth();
    const actor = session?.user ? { id: session.user.id, role: session.user.role } : null;

    const headerList = headers();
    const sessionId = getOrCreateAnalyticsSessionId();

    await recordResourceView({
      resourceId,
      viewer: actor,
      sessionId,
      ipHash: getClientIpHashFromHeaderGetter((name) => headerList.get(name)),
      userAgent: headerList.get("user-agent"),
      referrer: headerList.get("referer"),
    });
  } catch (error) {
    // Never let tracking failure surface to the visitor.
    // eslint-disable-next-line no-console
    console.error("[public-resource.actions] view tracking failed:", error);
  }
}
