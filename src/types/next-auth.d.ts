import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Module augmentation so the admin session/JWT carry the user's `id` and
 * `role` (US-030). `role` is populated in the `jwt` callback at sign-in and
 * surfaced on `session.user` in the `session` callback (see auth.config.ts).
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  // Shape returned by the Credentials `authorize` callback.
  interface User {
    role?: UserRole;
  }
}

// The `token` param in the Auth.js callbacks is typed via `@auth/core/jwt`'s
// `JWT`. `next-auth/jwt` only `export *`s that module, so augmenting it does
// NOT merge into the interface the callbacks see — augment the core module.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
  }
}
