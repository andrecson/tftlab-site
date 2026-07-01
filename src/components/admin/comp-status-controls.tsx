"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CompStatus } from "@prisma/client";
import {
  archiveComp,
  publishComp,
  unpublishComp,
  type CompActionResult,
} from "@/actions/comps";

/**
 * Publication controls for the edit page (US-038). Drives the
 * `publishComp`/`unpublishComp`/`archiveComp` server actions — a comp's
 * moderation status is owned here, NOT by the base `<CompForm>`. `publishComp`
 * enforces FR-20 server-side (name, tier, ≥1 trait, ≥1 carry, non-empty board);
 * a blocked publish comes back as `{ ok: false, error }` and is shown inline so
 * the curator knows exactly what to fill in.
 *
 * Client component so it can call the actions directly (React 18.3 has no
 * `useActionState`, so we mirror the other admin forms: `useState` + await).
 * On success it optimistically flips the local status (the source of truth for
 * which buttons render — `router.refresh()` re-runs the force-dynamic page but
 * does NOT reinit client state) and refreshes so sibling server reads update.
 */

const STATUS_META: Record<CompStatus, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  PUBLISHED: { label: "Publicada", className: "bg-primary/15 text-primary" },
  ARCHIVED: {
    label: "Arquivada",
    className: "bg-secondary/40 text-secondary-foreground",
  },
};

const primaryButton =
  "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60";

interface CompStatusControlsProps {
  comp: { id: string; slug: string; status: CompStatus };
}

export function CompStatusControls({ comp }: CompStatusControlsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<CompStatus>(comp.status);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(
    key: string,
    action: (id: string) => Promise<CompActionResult>,
    nextStatus: CompStatus,
    successMsg: string,
  ) {
    setError(null);
    setNotice(null);
    setPending(key);

    const result = await action(comp.id);

    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus(nextStatus);
    setNotice(successMsg);
    // Refresh the force-dynamic admin page so any sibling server reads (e.g. the
    // form's initial values) reflect the new status on next navigation.
    router.refresh();
  }

  const meta = STATUS_META[status];
  const busy = pending !== null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Publicação</h2>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${meta.className}`}
          >
            {meta.label}
          </span>
        </div>
        {status === "PUBLISHED" ? (
          <Link
            href={`/comps/${comp.slug}`}
            target="_blank"
            className="text-sm text-primary hover:underline"
          >
            Ver página pública ↗
          </Link>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        Uma comp só pode ser publicada com nome, tier, ao menos 1 sinergia, ao
        menos 1 carry e a composição final montada no board.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {status === "PUBLISHED" ? (
          <button
            type="button"
            onClick={() =>
              run(
                "unpublish",
                unpublishComp,
                "DRAFT",
                "Comp despublicada (voltou para rascunho).",
              )
            }
            disabled={busy}
            className={secondaryButton}
          >
            {pending === "unpublish" ? "Despublicando…" : "Despublicar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              run("publish", publishComp, "PUBLISHED", "Comp publicada.")
            }
            disabled={busy}
            className={primaryButton}
          >
            {pending === "publish" ? "Publicando…" : "Publicar"}
          </button>
        )}

        {status === "ARCHIVED" ? (
          <button
            type="button"
            onClick={() =>
              run(
                "unpublish",
                unpublishComp,
                "DRAFT",
                "Comp movida para rascunho.",
              )
            }
            disabled={busy}
            className={secondaryButton}
          >
            {pending === "unpublish" ? "Movendo…" : "Voltar para rascunho"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              run("archive", archiveComp, "ARCHIVED", "Comp arquivada.")
            }
            disabled={busy}
            className={secondaryButton}
          >
            {pending === "archive" ? "Arquivando…" : "Arquivar"}
          </button>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
