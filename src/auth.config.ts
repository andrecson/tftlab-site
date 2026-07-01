import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe base Auth.js config (US-030).
 *
 * This module must NOT import Prisma, bcrypt or any Node-only code: it is
 * consumed by `src/middleware.ts`, which runs on the Edge runtime, as well as
 * by the full Node config in `src/auth.ts`. The Credentials provider (which
 * needs the DB) is added only in `src/auth.ts`; middleware just verifies the
 * signed JWT, so an empty `providers` array here is intentional.
 */
export const authConfig = {
  // Curators sign in at /admin/login (no public sign-up exists).
  pages: {
    signIn: "/admin/login",
  },
  // Credentials-based auth requires stateless JWT sessions (no DB adapter).
  session: { strategy: "jwt" },
  callbacks: {
    // Persist the user id + role onto the token at sign-in.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // Expose the id + role on the client/server session object.
    session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id;
        if (token.role) session.user.role = token.role;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
