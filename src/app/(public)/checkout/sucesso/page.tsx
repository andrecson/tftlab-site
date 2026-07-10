import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { linkGuestPurchase } from "@/actions/subscription";
import { DiscordLoginButton } from "@/components/account/discord-login-button";
import { db } from "@/server/db";

export const metadata: Metadata = {
  title: "Pagamento confirmado",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  notfound: "Não encontramos essa compra. Fale com a gente no WhatsApp.",
  unpaid: "Ainda estamos confirmando seu pagamento. Aguarde alguns instantes e tente de novo.",
  falha: "Não deu para liberar o acesso. Tente de novo.",
};

/**
 * Guest post-payment link (PAY-014). Carries the checkoutToken. If the buyer is
 * not signed in, they log in with Discord (returning here); once signed in, a
 * click binds the paid checkout to their account and grants the role.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; erro?: string }>;
}) {
  const { token, erro } = await searchParams;
  const guest = token
    ? await db.guestCheckout.findUnique({ where: { checkoutToken: token } })
    : null;
  const session = await auth();
  const isCustomer = Boolean(session?.user?.discordId);
  const backHere = `/checkout/sucesso?token=${encodeURIComponent(token ?? "")}`;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-lg">
        <h1 className="text-2xl font-semibold text-foreground">
          Pagamento recebido
        </h1>

        {!token || !guest ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              {ERRORS.notfound}
            </p>
            <Link
              href="/planos"
              className="mt-6 inline-flex rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
            >
              Voltar aos planos
            </Link>
          </>
        ) : guest.status === "LINKED" ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Seu acesso já está liberado.
            </p>
            <Link
              href="/conta"
              className="mt-6 inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
            >
              Ir para minha conta
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Falta um passo: vincule seu Discord para liberar o cargo de
              assinante.
            </p>

            {erro ? (
              <p
                role="alert"
                className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {ERRORS[erro] ?? ERRORS.falha}
              </p>
            ) : null}

            <div className="mt-6">
              {isCustomer ? (
                <form action={linkGuestPurchase.bind(null, token)}>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)] transition-opacity hover:opacity-90"
                  >
                    Liberar meu acesso
                  </button>
                </form>
              ) : (
                <DiscordLoginButton callbackUrl={backHere} />
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
