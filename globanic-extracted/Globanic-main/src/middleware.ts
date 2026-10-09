import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth.config";
import { ADMIN_ROLES, PUBLISHER_ROLES } from "@/server/auth/rbac";

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;

  const loginRedirect = () =>
    NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(path)}`, nextUrl),
    );

  if (path.startsWith("/admin")) {
    if (!isLoggedIn) return loginRedirect();
    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  if (path.startsWith("/publisher")) {
    if (!isLoggedIn) return loginRedirect();

    // Any authenticated user (role USER included) may reach the
    // application form — becoming a Publisher happens through it.
    if (path.startsWith("/publisher/apply")) {
      return NextResponse.next();
    }

    if (!role || !PUBLISHER_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/publisher/apply", nextUrl));
    }
    return NextResponse.next();
  }

  if (path.startsWith("/account")) {
    if (!isLoggedIn) return loginRedirect();
    return NextResponse.next();
  }

  if (path.startsWith("/notifications")) {
    if (!isLoggedIn) return loginRedirect();
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/publisher/:path*", "/account/:path*", "/notifications/:path*"],
};
