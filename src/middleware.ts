import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Admin route protection (US-030). Runs on the Edge runtime, so it uses the
 * Prisma-free `authConfig` and only verifies the signed session JWT.
 *
 * - Requests to /admin/** without an ADMIN session are redirected to
 *   /admin/login (with a callbackUrl so they return after signing in).
 * - Already-authenticated admins hitting /admin/login are sent to /admin.
 * - Public routes (/, /comps/*, /builder, /builder/*) never match the config
 *   below, so they stay reachable without a session.
 *
 * "Admin" is gated on `role`, not merely a session existing: a customer signed
 * in with Discord (PAY-001) has a session but no `role`, so they are treated as
 * unauthenticated here. Checking only "is logged in" would loop them between
 * /admin (layout `requireRole` bounces them) and /admin/login (PAY-005).
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isAdmin = Boolean(req.auth?.user?.role);
  const isLoginPage = nextUrl.pathname === "/admin/login";

  if (isLoginPage) {
    if (isAdmin) {
      return Response.redirect(new URL("/admin", nextUrl));
    }
    return;
  }

  // Any other /admin/** path requires an admin session.
  if (!isAdmin) {
    const loginUrl = new URL("/admin/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return Response.redirect(loginUrl);
  }

  return;
});

export const config = {
  // Only guard the admin area; everything else is public. The API auth
  // endpoints (/api/auth/*) are deliberately excluded so sign-in works.
  matcher: ["/admin/:path*"],
};
