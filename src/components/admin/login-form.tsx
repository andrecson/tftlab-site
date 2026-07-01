"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Admin credentials login form (US-030, US-045). Uses the Auth.js client
 * `signIn` with `redirect: false` so we can show an inline error on bad
 * credentials and navigate to `callbackUrl` on success. The identifier is a
 * free-text username or e-mail (no format validation) — see the Credentials
 * provider in `src/auth.ts`. There is no public sign-up.
 */
export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      identifier: String(data.get("identifier") ?? ""),
      password: String(data.get("password") ?? ""),
      redirect: false,
    });

    if (!result || result.error) {
      setPending(false);
      setError("Usuário/e-mail ou senha inválidos.");
      return;
    }

    // Full navigation + refresh so server components pick up the new session.
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Usuário ou e-mail</span>
        <input
          name="identifier"
          type="text"
          autoComplete="username"
          required
          className="rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none ring-ring focus-visible:ring-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none ring-ring focus-visible:ring-2"
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
