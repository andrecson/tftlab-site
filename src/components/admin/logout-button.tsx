"use client";

import { signOut } from "next-auth/react";

/**
 * Sign-out control for the admin area (US-030). Uses the Auth.js client
 * `signOut`, sending the curator back to the login page afterwards.
 */
export function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className={
        className ??
        "rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      }
    >
      Sair
    </button>
  );
}
