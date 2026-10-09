import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./password";
import { loginSchema } from "@/lib/validation/auth.schema";
import type { Role } from "./rbac";
import type { Locale } from "@prisma/client";

import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { profile: true },
        });

        // Same generic failure for "no user" and "wrong password" —
        // never reveal which one it was (avoids user enumeration).
        if (!user || !user.passwordHash) return null;
        if (user.status !== "ACTIVE") return null;
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName ?? user.email,
          role: user.role,
          // Phase 16A (Review 1): carried through so a fresh
          // device/browser (no locale cookie yet) still renders in the
          // right language immediately after login. `null` (no stored
          // preference) becomes `undefined` here — same "no explicit
          // choice" meaning either way, just matching the optional-field
          // shape declared in next-auth.d.ts.
          locale: user.preferredLocale ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fresh sign-in: seed the token from the just-authorized user.
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
        token.locale = (user as { locale?: Locale }).locale;
        return token;
      }

      if (token.id) {
        // Re-validate on every subsequent request so that an admin
        // suspending a user or changing a role takes effect immediately,
        // instead of waiting for the JWT to expire.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          // `preferredLocale` added here (Phase 16A, Review 1) rides
          // this same already-existing every-request query — no new
          // DB round trip. Purely additive: the role/status
          // re-validation and invalidation logic below is unchanged.
          select: { role: true, status: true, preferredLocale: true },
        });

        if (!dbUser || dbUser.status !== "ACTIVE") {
          // Invalidate the session — force a fresh sign-in.
          return { ...token, id: undefined, role: undefined, invalidated: true };
        }

        token.role = dbUser.role;
        token.locale = dbUser.preferredLocale ?? undefined;
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.id && !token.invalidated) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.locale = token.locale;
      }
      return session;
    },
  },
});
