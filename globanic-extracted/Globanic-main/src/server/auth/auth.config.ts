import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import type { Role } from "./rbac";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (token?.id && !token.invalidated) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { auth } = NextAuth(authConfig);
