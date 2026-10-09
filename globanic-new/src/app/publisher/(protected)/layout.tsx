import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/server/auth/auth.config";
import { PUBLISHER_ROLES } from "@/server/auth/rbac";

export default async function PublisherProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/publisher/dashboard");
  }

  // Independent server-side check, in addition to middleware: a USER who
  // has not been verified as a Publisher is redirected to the application
  // form instead of seeing the dashboard.
  if (!PUBLISHER_ROLES.includes(session.user.role)) {
    redirect("/publisher/apply");
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
