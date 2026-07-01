import type { Metadata } from "next";
import Link from "next/link";
import { getAdminDashboardStats } from "@/server/queries/admin";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** Stable pt-BR DD/MM/YYYY formatting (UTC parts, no locale/timezone drift). */
function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** A single count tile; optionally a link into the matching admin list. */
function StatCard({
  label,
  value,
  href,
  emphasis,
}: {
  label: string;
  value: number;
  href?: string;
  emphasis?: boolean;
}) {
  const body = (
    <div
      className={`rounded-xl border bg-card p-5 transition-colors ${
        emphasis ? "border-primary/40" : "border-border"
      } ${href ? "hover:border-primary/60 hover:bg-card/80" : ""}`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-3xl font-semibold ${
          emphasis ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Quick-access links to the admin sections. */
const QUICK_LINKS = [
  { href: "/admin/comps", label: "Comps", hint: "Criar e editar composições" },
  { href: "/admin/catalog", label: "Catálogo", hint: "Campeões, itens e traits" },
  { href: "/admin/patches", label: "Patches", hint: "Patch atual e histórico" },
] as const;

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.currentSet ? (
            <>
              Set atual:{" "}
              <span className="font-medium text-foreground">
                {stats.currentSet}
              </span>
            </>
          ) : (
            "Nenhum set configurado ainda."
          )}
        </p>
      </div>

      {/* Current patch */}
      <section
        aria-labelledby="patch-atual"
        className="rounded-xl border border-border bg-card p-5"
      >
        <h2
          id="patch-atual"
          className="text-sm font-medium text-muted-foreground"
        >
          Patch atual
        </h2>
        {stats.currentPatch ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-semibold text-primary">
              {stats.currentPatch.version}
            </span>
            <span className="text-sm text-muted-foreground">
              lançado em {formatDate(stats.currentPatch.releasedAt)}
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum patch configurado.
          </p>
        )}
      </section>

      {/* Counts */}
      <section aria-labelledby="contagens">
        <h2 id="contagens" className="sr-only">
          Contagem de comps
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Rascunhos"
            value={stats.draftCount}
            href="/admin/comps?status=draft"
            emphasis
          />
          <StatCard
            label="Publicadas"
            value={stats.publishedCount}
            href="/admin/comps?status=published"
          />
          <StatCard
            label="Arquivadas"
            value={stats.archivedCount}
            href="/admin/comps?status=archived"
          />
        </div>
      </section>

      {/* Section navigation */}
      <section aria-labelledby="atalhos">
        <h2
          id="atalhos"
          className="mb-3 text-sm font-medium text-muted-foreground"
        >
          Ir para
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60 hover:bg-card/80"
            >
              <p className="font-medium text-foreground">{link.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{link.hint}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
