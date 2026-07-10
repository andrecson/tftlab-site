import type { Metadata } from "next";
import Link from "next/link";

import { DiscordLoginButton } from "@/components/account/discord-login-button";

export const metadata: Metadata = {
  title: "Entrar",
  description:
    "Entre com o Discord para acessar sua conta e sua assinatura do TFTLab.",
  robots: { index: false, follow: false },
};

/** Only allow internal, single-slash redirect targets (guards open redirects). */
function safeCallback(raw: string | undefined): string {
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/conta";
}

/**
 * Customer login (PAY-003). A single "Entrar com Discord" button. `callbackUrl`
 * says where to return after auth (a plan checkout, or /conta by default).
 */
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const target = safeCallback(callbackUrl);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
        <Link
          href="/"
          aria-label="TFTLab.br"
          className="text-xl font-bold italic tracking-tight"
        >
          <span className="text-primary">TFTLab</span>
          <span className="text-primary/50">.br</span>
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-foreground">Sua conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre com o Discord para ver sua assinatura, liberar o acesso e entrar
          no servidor.
        </p>

        <div className="mt-6">
          <DiscordLoginButton callbackUrl={target} />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Ao entrar, você já é adicionado ao nosso servidor do Discord. O cargo de
          assinante é liberado assim que o pagamento é confirmado.
        </p>
      </div>
    </main>
  );
}
