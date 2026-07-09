import type { Metadata } from "next";

import { SubscribersManager } from "@/components/admin/subscribers-manager";
import { discordConfigured } from "@/lib/discord";
import { getSubscribers } from "@/server/queries/subscribers";

export const metadata: Metadata = {
  title: "Assinantes",
};

/** A single count tile for the subscribers overview panel. */
function StatTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-5 ${
        emphasis ? "border-primary/40" : "border-border"
      }`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-3xl font-semibold tabular-nums ${
          emphasis ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Curator panel for the Discord subscriber role. Under the `(admin)` group, so
 * it inherits `requireRole("EDITOR")` + force-dynamic. Lists everyone who linked
 * Discord for a subscription and lets a curator grant/revoke the role, adjust
 * the expiry, rename a member, or comp a member by Discord ID.
 */
export default async function AdminSubscribersPage() {
  const subscribers = await getSubscribers();
  const discordReady = discordConfigured();

  // Overview counts (computed server-side from the full, unfiltered list).
  const activeCount = subscribers.filter((s) => s.status === "ACTIVE").length;
  const activeStripe = subscribers.filter(
    (s) => s.status === "ACTIVE" && s.provider === "STRIPE",
  ).length;
  const activeMp = subscribers.filter(
    (s) => s.status === "ACTIVE" && s.provider === "MERCADOPAGO",
  ).length;
  const pendingCount = subscribers.filter((s) => s.status === "PENDING").length;
  const inactiveCount = subscribers.filter(
    (s) => s.status === "EXPIRED" || s.status === "CANCELED",
  ).length;

  // A single reference "now" shared with the client so the "active for X"
  // durations render identically on the server and after hydration.
  const now = new Date().toISOString();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Assinantes</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Veja e gerencie o cargo de assinante no Discord: conceder, revogar,
          ajustar o vencimento, renomear, ou liberar um membro manualmente pelo
          Discord ID.
        </p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Assinantes ativos" value={activeCount} emphasis />
        <StatTile label="Ativos Stripe" value={activeStripe} />
        <StatTile label="Ativos Mercado Pago" value={activeMp} />
        <StatTile label="Aguardando" value={pendingCount} />
        <StatTile label="Inativos" value={inactiveCount} />
        <StatTile label="Total" value={subscribers.length} />
      </div>

      {!discordReady && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
        >
          As chaves do Discord (DISCORD_*) ainda não estão configuradas, então
          conceder/revogar o cargo não vai funcionar até você setá-las. A lista e
          os status funcionam normalmente.
        </p>
      )}

      <SubscribersManager subscribers={subscribers} now={now} />
    </div>
  );
}
