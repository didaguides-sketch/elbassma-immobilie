"use server";

import { auth } from "@/server/auth/auth";
import { getOrCreateAnalyticsSessionId } from "@/lib/utils/analytics-session";
import { claimAttributionOnLogin } from "@/server/services/referral.service";

/**
 * Called once from LoginForm.tsx immediately after a successful
 * signIn() — NOT from inside any Auth.js callback in auth.config.ts,
 * which stays completely untouched. Reads the just-established session
 * itself rather than trusting a client-supplied user id, and silently
 * no-ops on any failure: a referral claim failing must never block or
 * error out a successful login.
 */
export async function claimAttributionOnLoginAction(): Promise<void> {
  try {
    const session = await auth();
    if (!session?.user) return;
    const sessionId = getOrCreateAnalyticsSessionId();
    await claimAttributionOnLogin(session.user.id, sessionId);
  } catch {
    // Never let an attribution-claim failure surface as a login error.
  }
}
