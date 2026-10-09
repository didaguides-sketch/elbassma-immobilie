import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/server/auth/auth.config";
import { ADMIN_ROLES } from "@/server/auth/rbac";

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  // PUBLISHER must never reach here, even if middleware were misconfigured
  // or bypassed — this is the authoritative server-side check.
  if (!ADMIN_ROLES.includes(session.user.role)) {
    redirect("/");
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
