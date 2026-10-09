import type { Role } from "@/server/auth/rbac";
import type { Locale } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      // Phase 16A (Review 1): the user's durable UI-language preference,
      // carried through the JWT so a fresh device/browser with no
      // locale cookie yet can still render in the right language on
      // first paint after login, without an extra DB round trip beyond
      // the one auth.ts's `jwt` callback already performs every request
      // for role/status re-validation. Never read by can()/requireRole()
      // or any authorization check — see rbac.ts, untouched by this.
      locale?: Locale;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    locale?: Locale;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    locale?: Locale;
    invalidated?: boolean;
  }
}
