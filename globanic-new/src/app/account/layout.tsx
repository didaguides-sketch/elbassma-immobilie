import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/server/auth/auth.config";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Middleware already blocks this route for anonymous visitors; this check
  // is a second, independent guard executed on the server for the page itself.
  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
