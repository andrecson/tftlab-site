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
    // Persist identity onto the token at sign-in. Two flavours:
    //   - Discord (customer, PAY-001): discordId + username from the OAuth
    //     profile; kind = "customer".
    //   - Credentials (admin): user id + role; kind = "admin".
    // Later calls (session refresh) carry no `account`/`user`, so the token is
    // returned untouched, preserving whichever shape was set at sign-in.
    jwt({ token, user, account, profile }) {
      if (account?.provider === "discord") {
        // `Profile` doesn't declare Discord's fields — read them off a narrow
        // cast rather than fighting the type.
        const p = (profile ?? {}) as {
          id?: string | number;
          username?: string;
          global_name?: string | null;
          email?: string | null;
        };
        token.kind = "customer";
        const id = p.id ?? user?.id;
        if (id != null) token.discordId = String(id);
        token.discordUsername =
          (p.global_name && String(p.global_name)) ||
          (p.username && String(p.username)) ||
          user?.name ||
          null;
        if (typeof p.email === "string") token.email = p.email;
        return token;
      }
      if (user) {
        token.kind = "admin";
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // Expose the identity on the client/server session object.
    session({ session, token }) {
      if (session.user) {
        session.user.kind = token.kind;
        if (token.id) session.user.id = token.id;
        if (token.role) session.user.role = token.role;
        if (token.discordId) session.user.discordId = token.discordId;
        if (token.discordUsername !== undefined) {
          session.user.discordUsername = token.discordUsername;
        }
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
