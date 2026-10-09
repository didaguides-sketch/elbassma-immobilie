import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/server/auth/auth";
import { ADMIN_ROLES } from "@/server/auth/rbac";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 sm:flex-row">
      <AdminSidebar userEmail={session.user.email ?? ""} userRole={session.user.role} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
