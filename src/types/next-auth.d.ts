import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Module augmentation for the session/JWT. The same Auth.js instance serves two
 * kinds of sign-in:
 *   - admin/curator via the Credentials provider → carries `id` + `role`
 *     (US-030), `kind: "admin"`.
 *   - customer via the Discord provider (PAY-001) → carries `discordId` +
 *     `discordUsername`, `kind: "customer"`; no `role`.
 * All fields are optional so both shapes fit one union. Guard by `kind`/`role`
 * (admin) or `discordId` (customer).
 */
declare module "next-auth" {
  interface Session {
    user: {
      kind?: "admin" | "customer";
      id?: string;
      role?: UserRole;
      discordId?: string;
      discordUsername?: string | null;
    } & DefaultSession["user"];
  }

  // Shape returned by the Credentials `authorize` callback (admin).
  interface User {
    role?: UserRole;
  }
}

// The `token` param in the Auth.js callbacks is typed via `@auth/core/jwt`'s
// `JWT`. `next-auth/jwt` only `export *`s that module, so augmenting it does
// NOT merge into the interface the callbacks see — augment the core module.
declare module "@auth/core/jwt" {
  interface JWT {
    kind?: "admin" | "customer";
    id?: string;
    role?: UserRole;
    discordId?: string;
    discordUsername?: string | null;
  }
}
