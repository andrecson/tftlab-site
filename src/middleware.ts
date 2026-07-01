import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Admin route protection (US-030). Runs on the Edge runtime, so it uses the
 * Prisma-free `authConfig` and only verifies the signed session JWT.
 *
 * - Unauthenticated requests to /admin/** are redirected to /admin/login
 *   (with a callbackUrl so they return after signing in).
 * - Already-authenticated users hitting /admin/login are sent to /admin.
 * - Public routes (/, /comps/*, /builder, /builder/*) never match the config
 *   below, so they stay reachable without a session.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth?.user);
  const isLoginPage = nextUrl.pathname === "/admin/login";

  if (isLoginPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/admin", nextUrl));
    }
    return;
  }

  // Any other /admin/** path requires authentication.
  if (!isLoggedIn) {
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
