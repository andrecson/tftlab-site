import type { Metadata } from "next";

import { SubscribersManager } from "@/components/admin/subscribers-manager";
import { discordConfigured } from "@/lib/discord";
import { getSubscribers } from "@/server/queries/subscribers";

export const metadata: Metadata = {
  title: "Assinantes",
};

/**
 * Curator panel for the Discord subscriber role. Under the `(admin)` group, so
 * it inherits `requireRole("EDITOR")` + force-dynamic. Lists everyone who linked
 * Discord for a subscription and lets a curator grant/revoke the role, adjust
 * the expiry, or comp a member by Discord ID.
 */
export default async function AdminSubscribersPage() {
  const subscribers = await getSubscribers();
  const discordReady = discordConfigured();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Assinantes</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Veja e gerencie o cargo de assinante no Discord: conceder, revogar,
          ajustar o vencimento, ou liberar um membro manualmente pelo Discord ID.{" "}
          {subscribers.length}{" "}
          {subscribers.length === 1 ? "assinante" : "assinantes"}.
        </p>
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

      <SubscribersManager subscribers={subscribers} />
    </div>
  );
}
