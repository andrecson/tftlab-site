"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

/**
 * "Entrar com Discord" button (PAY-003). Uses the Auth.js client `signIn` with
 * the Discord provider; on success the user returns to `callbackUrl` (a plan
 * checkout or /conta). Reuses the site's primary button styling.
 */
export function DiscordLoginButton({ callbackUrl }: { callbackUrl: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signIn("discord", { callbackUrl });
      }}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <DiscordGlyph className="h-5 w-5" />
      {pending ? "Redirecionando…" : "Entrar com Discord"}
    </button>
  );
}

function DiscordGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3c-.2.36-.43.845-.588 1.23a18.27 18.27 0 0 0-5.94 0A12.6 12.6 0 0 0 9.44 3 19.74 19.74 0 0 0 5.677 4.37C2.86 8.6 2.1 12.72 2.48 16.78a19.9 19.9 0 0 0 6.073 3.08c.49-.67.927-1.38 1.304-2.13-.717-.27-1.404-.605-2.053-.996.172-.126.34-.257.5-.393a14.2 14.2 0 0 0 12.19 0c.163.14.33.27.5.393-.65.39-1.34.726-2.055.997.377.747.813 1.457 1.303 2.128a19.84 19.84 0 0 0 6.075-3.08c.447-4.72-.766-8.8-3.2-12.411ZM9.34 14.29c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.094 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm5.32 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.094 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z" />
    </svg>
  );
}
