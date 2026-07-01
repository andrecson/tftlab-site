import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

/**
 * Admin login page (US-030). Reachable without a session (the middleware lets
 * it through and bounces already-signed-in users to /admin). It reads
 * `callbackUrl` (where to return after login) and `error` from the query
 * string on the server and passes them into the client form.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  // Only allow internal admin redirects (guards against open-redirect payloads).
  const callbackUrl =
    typeof params.callbackUrl === "string" &&
    params.callbackUrl.startsWith("/admin") &&
    !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : "/admin";
  const forbidden = params.error === "forbidden";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
        <Link
          href="/"
          className="bg-brand-gradient bg-clip-text text-xl font-bold text-transparent"
        >
          MetaComps
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-foreground">
          Painel administrativo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesso restrito a curadores. Entre com suas credenciais.
        </p>

        {forbidden ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            Você não tem permissão para acessar essa área.
          </p>
        ) : null}

        <div className="mt-6">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </main>
  );
}
