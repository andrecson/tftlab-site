import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CompStatus } from "@prisma/client";

import { CompAugments } from "@/components/comp-augments";
import { CompBoard } from "@/components/comp-board";
import { CompCarries, CompItemPriority } from "@/components/comp-carries";
import { CompGuide } from "@/components/comp-guide";
import { CompHeader } from "@/components/comp-header";
import { CompUnits } from "@/components/comp-units";
import { OpenInBuilder } from "@/components/open-in-builder";
import { getAdminCompForPreview } from "@/server/queries/admin";
import { getSiteConfig } from "@/server/queries/config";

/**
 * Draft preview page (US-040) — served at `/admin/preview/[id]`.
 *
 * Renders any comp (DRAFT/PUBLISHED/ARCHIVED) exactly as it appears on the
 * public `/comps/[slug]` page, so a curator can review before publishing. It
 * lives under the `(admin)` route group, so the `requireRole` guard in that
 * group's layout makes it reachable only by authenticated curators, and the
 * layout's `robots: { index: false, follow: false }` already applies — we also
 * set `noindex` here explicitly (AC). Drafts never leak to the public tier list
 * or sitemap because those queries filter `status: "PUBLISHED"`.
 *
 * Data comes straight from `getAdminCompForPreview` (NOT `unstable_cache`'d — the
 * admin subtree is `force-dynamic`, so unpublished edits show immediately).
 */
export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

/** Portuguese status labels, mirroring the admin status controls (US-038). */
const STATUS_LABEL: Record<CompStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicada",
  ARCHIVED: "Arquivada",
};

export default async function CompPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [comp, config] = await Promise.all([
    getAdminCompForPreview(id),
    getSiteConfig(),
  ]);

  if (!comp) {
    notFound();
  }

  const currentPatchId = config?.currentPatchId ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Preview banner — makes it unmistakable this is an internal preview and
          which lifecycle state the comp is in, then links back to the editor. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-primary">Preview interno</span>
          <span className="text-muted-foreground">
            Assim a comp aparece na página pública.
          </span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {STATUS_LABEL[comp.status]}
          </span>
        </div>
        <Link
          href={`/admin/comps/${comp.id}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Voltar para edição
        </Link>
      </div>

      <article className="mx-auto w-full max-w-4xl">
        <CompHeader comp={comp} currentPatchId={currentPatchId} />
        <div className="mt-6">
          <OpenInBuilder comp={comp} />
        </div>
        <div className="mt-8 flex flex-col gap-8">
          <CompCarries units={comp.units} />
          <CompItemPriority items={comp.itemPriority} />
          <CompBoard units={comp.units} />
          <CompUnits units={comp.units} />
          <CompAugments
            augments={comp.augments}
            augmentPriority={comp.augmentPriority}
          />
          <CompGuide comp={comp} />
        </div>
      </article>
    </div>
  );
}
