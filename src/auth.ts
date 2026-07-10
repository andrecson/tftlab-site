import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { db } from "@/server/db";
import { joinGuild } from "@/lib/discord";
import { authConfig } from "@/auth.config";

/**
 * Full Node-runtime Auth.js instance (US-030). Adds the Credentials provider
 * that authenticates a curator against the `User` table. This module pulls in
 * Prisma + bcrypt, so it must only be imported from server components, server
 * actions, route handlers or the [...nextauth] API route — NEVER from
 * middleware (use `@/auth.config` there instead).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // Admin/curator login: the form posts an identifier + password. The
      // identifier may be an e-mail (admin@metacomps.gg) or a plain username
      // (tftlab, US-045) — both are stored in the unique `email` column. There
      // is no public sign-up; accounts are provisioned via the seed / admin.
      credentials: {
        identifier: { label: "Usuário ou e-mail", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        // Normalize the identifier (trim + lowercase) so login is
        // case-insensitive and matches the seeded value exactly.
        const email =
          typeof credentials?.identifier === "string"
            ? credentials.identifier.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        // Reject unknown users and accounts without a local password (e.g. a
        // future OAuth-only account) without leaking which case it was.
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    // Customer sign-in (PAY-001). `guilds.join` lets us add the buyer to the
    // Discord server at login (see the signIn event below); `identify`+`email`
    // give us the id/username/email we attribute payments to. Reuses the same
    // DISCORD_CLIENT_ID/SECRET as the old bespoke OAuth route.
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: "identify email guilds.join" } },
    }),
  ],
  events: {
    // Add the customer to the Discord guild as a plain member at login (no
    // role — the payment webhook grants the subscriber role later, PAY-002).
    // Best-effort: a failure here must never block sign-in.
    async signIn({ account, profile }) {
      if (account?.provider === "discord" && profile?.id && account.access_token) {
        try {
          await joinGuild(String(profile.id), account.access_token);
        } catch (err) {
          console.error("[auth] joinGuild on sign-in failed", err);
        }
      }
    },
  },
});

/** ADMIN outranks EDITOR; a higher rank satisfies any lower requirement. */
const ROLE_RANK: Record<UserRole, number> = { EDITOR: 1, ADMIN: 2 };

/**
 * Server-only guard for admin routes/actions. Returns the authenticated
 * session when the current user meets `minRole` (default EDITOR — any
 * curator). Redirects to /admin/login when unauthenticated, and to
 * /admin/login?error=forbidden when the role is insufficient. Use at the top
 * of protected admin server components / server actions (US-031+).
 */
export async function requireRole(minRole: UserRole = "EDITOR") {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }
  const role = session.user.role;
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    redirect("/admin/login?error=forbidden");
  }
  return session;
}

/**
 * Server-only guard for customer routes (PAY-004). Returns the signed-in
 * customer's Discord identity, or redirects to /entrar (preserving where they
 * were headed) when there is no customer session. Use at the top of /conta and
 * the authenticated checkout.
 */
export async function requireCustomer(callbackUrl = "/conta"): Promise<{
  discordId: string;
  discordUsername: string | null;
  email: string | null;
}> {
  const session = await auth();
  const discordId = session?.user?.discordId;
  if (!discordId) {
    redirect(`/entrar?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return {
    discordId,
    discordUsername: session?.user?.discordUsername ?? null,
    email: session?.user?.email ?? null,
  };
}
