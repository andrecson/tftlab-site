import type { Metadata } from "next";
import Link from "next/link";
import type { CompStatus } from "@prisma/client";
import { getAdminComps } from "@/server/queries/admin";
import { TIER_META } from "@/lib/tiers";

export const metadata: Metadata = {
  title: "Comps",
};

/** Query-param token (used in dashboard links) → CompStatus enum. */
const STATUS_BY_PARAM: Record<string, CompStatus> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED",
};

/** Status filter tabs, in the order they appear above the list. */
const STATUS_TABS: { label: string; status?: CompStatus; href: string }[] = [
  { label: "Todas", href: "/admin/comps" },
  { label: "Rascunhos", status: "DRAFT", href: "/admin/comps?status=draft" },
  {
    label: "Publicadas",
    status: "PUBLISHED",
    href: "/admin/comps?status=published",
  },
  {
    label: "Arquivadas",
    status: "ARCHIVED",
    href: "/admin/comps?status=archived",
  },
];

/** pt-BR label + badge styling per moderation status. */
const STATUS_META: Record<CompStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Rascunho",
    className: "bg-muted text-muted-foreground",
  },
  PUBLISHED: {
    label: "Publicada",
    className: "bg-primary/15 text-primary",
  },
  ARCHIVED: {
    label: "Arquivada",
    className: "bg-secondary/40 text-secondary-foreground",
  },
};

/** Stable pt-BR DD/MM/YYYY (UTC parts, no locale/timezone drift). */
function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export default async function AdminCompsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const activeStatus = statusParam ? STATUS_BY_PARAM[statusParam] : undefined;
  const comps = await getAdminComps(activeStatus);

  return (
    <div className="flex flex-col gap-6">
      {/* Header + create action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Comps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {comps.length}{" "}
            {comps.length === 1 ? "composição" : "composições"}
            {activeStatus ? ` · ${STATUS_META[activeStatus].label}` : ""}
          </p>
        </div>
        <Link
          href="/admin/comps/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Nova comp
        </Link>
      </div>

      {/* Status filter tabs */}
      <nav
        aria-label="Filtrar por status"
        className="flex flex-wrap gap-1 border-b border-border pb-3 text-sm font-medium"
      >
        {STATUS_TABS.map((tab) => {
          const active = tab.status === activeStatus;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-md bg-muted px-3 py-1.5 text-foreground"
                  : "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* List */}
      {comps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {activeStatus
              ? `Nenhuma comp ${STATUS_META[activeStatus].label.toLowerCase()} encontrada.`
              : "Nenhuma comp cadastrada ainda."}
          </p>
          <Link
            href="/admin/comps/new"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Criar a primeira comp
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {comps.map((comp) => {
            const status = STATUS_META[comp.status];
            const tier = TIER_META[comp.tier];
            return (
              <li
                key={comp.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card p-4"
              >
                {/* Name + slug — full width on mobile so it never gets
                    squeezed out by the metadata chips; shares the line on sm+. */}
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <p className="truncate font-medium text-foreground">
                    {comp.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    /{comp.slug}
                  </p>
                </div>

                {/* Tier */}
                <span
                  className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-semibold text-background ${tier.chipClass}`}
                >
                  {comp.tier === "X" ? "Situacional" : comp.tier}
                </span>

                {/* Status */}
                <span
                  className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>

                {/* Patch */}
                <div className="shrink-0 text-xs text-muted-foreground">
                  <span>Patch {comp.patchIntroduced.version}</span>
                  {comp.patchUpdated ? (
                    <span className="ml-2 text-primary/80">
                      atualizado {comp.patchUpdated.version}
                    </span>
                  ) : null}
                </div>

                {/* Last edit */}
                <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
                  {formatDate(comp.updatedAt)}
                </span>

                {/* Edit action */}
                <Link
                  href={`/admin/comps/${comp.id}`}
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  Editar
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
