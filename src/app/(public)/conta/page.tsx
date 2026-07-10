import type { Metadata } from "next";
import Link from "next/link";

import { requireCustomer } from "@/auth";
import { cancelMySubscription } from "@/actions/subscription";
import { db } from "@/server/db";

export const metadata: Metadata = {
  title: "Minha conta",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<string, string> = { month: "Mensal", year: "Anual" };
const METHOD_LABEL: Record<string, string> = {
  PIX: "Pix",
  CARD: "Cartão (recorrente)",
  PIX_AUTOMATICO: "Pix Automático",
};

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Customer dashboard (PAY-011/012). Shows the subscription status and lets the
 * customer assinar/renovar, cancel a recurring subscription, and open the
 * Discord server. Guarded by requireCustomer (redirects to /entrar).
 */
export default async function ContaPage() {
  const { discordId, discordUsername } = await requireCustomer("/conta");
  const sub = await db.subscriber.findUnique({ where: { discordId } });

  const guildId = process.env.DISCORD_GUILD_ID;
  const isActive = sub?.status === "ACTIVE";
  const isCanceled = Boolean(sub?.canceledAt);
  const canCancelRecurring =
    isActive && !isCanceled && sub?.paymentMethod === "CARD";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-foreground">Minha conta</h1>
        <span className="text-sm text-muted-foreground">
          {discordUsername ?? "Discord"}
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        {!sub || sub.status === "PENDING" ? (
          sub?.status === "PENDING" ? (
            <>
              <h2 className="text-lg font-semibold text-foreground">
                Pagamento em processamento
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Assim que o pagamento for confirmado, seu cargo de assinante é
                liberado automaticamente.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground">
                Você ainda não tem uma assinatura ativa
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha um plano para liberar as aulas ao vivo, os guias e a
                comunidade.
              </p>
              <Link
                href="/planos"
                className="mt-4 inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
              >
                Ver planos
              </Link>
            </>
          )
        ) : isActive ? (
          <>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                {isCanceled ? "Cancelada" : "Ativa"}
              </span>
              <span className="text-sm text-muted-foreground">
                {PLAN_LABEL[sub.plan] ?? sub.plan}
                {sub.paymentMethod
                  ? ` · ${METHOD_LABEL[sub.paymentMethod] ?? sub.paymentMethod}`
                  : ""}
              </span>
            </div>
            <p className="mt-3 text-sm text-foreground">
              {isCanceled
                ? `Assinatura cancelada. Seu acesso continua até ${formatDate(sub.currentPeriodEnd)}.`
                : `Acesso liberado até ${formatDate(sub.currentPeriodEnd)}.`}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {guildId ? (
                <a
                  href={`https://discord.com/channels/${guildId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Abrir o servidor
                </a>
              ) : null}
              {canCancelRecurring ? (
                <form action={cancelMySubscription}>
                  <button
                    type="submit"
                    className="inline-flex rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                  >
                    Cancelar assinatura
                  </button>
                </form>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground">
              Sua assinatura encerrou
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sub.currentPeriodEnd
                ? `O acesso terminou em ${formatDate(sub.currentPeriodEnd)}.`
                : "O acesso não está mais ativo."}{" "}
              Renove para voltar a ter o cargo de assinante.
            </p>
            <Link
              href="/planos"
              className="mt-4 inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
            >
              Renovar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
