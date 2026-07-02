import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

import { CompAugments } from "@/components/comp-augments";
import { CompBoard } from "@/components/comp-board";
import { CompCarries, CompItemPriority } from "@/components/comp-carries";
import { CompGuide } from "@/components/comp-guide";
import { CompHeader } from "@/components/comp-header";
import { OpenInBuilder } from "@/components/open-in-builder";
import { TrackEvent } from "@/components/analytics/track-event";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { computeSynergies } from "@/lib/synergy";
import { TIER_META } from "@/lib/tiers";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { CompDetail } from "@/server/queries/comp";
import { getCompBySlug, getPublishedCompSlugs } from "@/server/queries/comp";
import {
  getBuilderChampions,
  getBuilderTraits,
} from "@/server/queries/catalog";
import { getSiteConfig } from "@/server/queries/config";

/**
 * Comp-detail page (US-017: header + metadata) — served at `/comps/[slug]`.
 *
 * Statically generated for every published comp via `generateStaticParams`, with
 * ISR: the data is wrapped in `unstable_cache` tagged `comp:<slug>` so US-038's
 * publish/unpublish action can refresh a single comp with
 * `revalidateTag("comp:" + slug)`. The `tierlist` tag is also attached so a
 * patch change (US-039, which revalidates `tierlist`) refreshes the Novo/
 * Atualizado badges here too. Unpublished/unknown slugs 404.
 *
 * The header/metadata (US-017), the carries + item-priority sections (US-018),
 * the early/core/flex unit lists (US-019), the board positioning (US-020), the
 * augments + augment priority (US-021) and the guide (US-022) are all rendered
 * here.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const slugs = await getPublishedCompSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    // No DB at build time (e.g. `docker build`) → prerender nothing; pages are
    // generated on-demand at runtime via ISR (dynamicParams defaults to true).
    return [];
  }
}

/** A computed active synergy for the board, ready to render above it. */
export interface CompSynergy {
  key: string;
  name: string;
  iconUrl: string;
  tier: number;
  count: number;
  nextBreakpoint: number | null;
  maxed: boolean;
}

/**
 * Compute the active synergies from the comp's on-board CORE units (same engine
 * the builder uses) — NOT the manually-stored traits. Needs the set's champion→
 * trait map and trait breakpoints.
 */
async function computeCompSynergies(comp: CompDetail): Promise<CompSynergy[]> {
  const [champions, traits] = await Promise.all([
    getBuilderChampions(comp.set),
    getBuilderTraits(comp.set),
  ]);
  const champById = new Map(champions.map((c) => [c.id, c]));
  const boardUnits = comp.units.filter(
    (u) => u.role === "CORE" && u.boardRow !== null && u.boardCol !== null,
  );
  const synergyUnits = boardUnits.map((u) => ({
    championId: u.championId,
    traits: (champById.get(u.championId)?.traits ?? []).map((t) => t.id),
  }));
  const traitInfos = traits.map((t) => ({
    key: t.id,
    name: t.name,
    breakpoints: t.breakpoints,
  }));
  const traitById = new Map(traits.map((t) => [t.id, t]));
  return computeSynergies(synergyUnits, traitInfos).map((active) => ({
    key: active.key,
    name: active.name,
    iconUrl: traitById.get(active.key)?.iconUrl ?? "",
    tier: active.tier,
    count: active.count,
    nextBreakpoint: active.nextBreakpoint,
    maxed: active.maxed,
  }));
}

/** Cached comp + current patch id (for badges) + computed board synergies. */
function getCompData(slug: string) {
  return unstable_cache(
    async () => {
      const [comp, config] = await Promise.all([
        getCompBySlug(slug),
        getSiteConfig(),
      ]);
      const synergies = comp ? await computeCompSynergies(comp) : [];
      return {
        comp,
        currentPatchId: config?.currentPatchId ?? null,
        synergies,
      };
    },
    ["comp-detail", slug],
    { tags: [`comp:${slug}`, "tierlist"] },
  )();
}

/** The patch a comp is "current" for — the update patch if any, else introduced. */
function compPatchVersion(comp: CompDetail): string {
  return comp.patchUpdated?.version ?? comp.patchIntroduced.version;
}

/**
 * ISO string for a date value. `getCompData` reads through `unstable_cache`,
 * which JSON-serializes its result, so `Date` fields come back as ISO strings on
 * cache hits (and as real `Date`s on the first, cache-miss call). `new Date(...)`
 * normalizes both, so metadata/JSON-LD dates work either way.
 */
function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

/** Collapse whitespace and clamp a string to `max` chars with an ellipsis. */
function clamp(text: string, max = 160): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/**
 * SEO description for a comp: its "when to play" blurb when present, otherwise a
 * synthesized summary with tier, patch, carries and synergies.
 */
function buildCompDescription(comp: CompDetail): string {
  if (comp.whenToPlay?.trim()) return clamp(comp.whenToPlay);

  const carries = comp.units
    .filter((unit) => unit.isCarry)
    .map((unit) => unit.champion.name)
    .join(", ");
  const traits = comp.traits.map((compTrait) => compTrait.trait.name).join(", ");

  const bits = [
    `Comp de TFT ${TIER_META[comp.tier].label} no patch ${compPatchVersion(comp)}.`,
  ];
  if (carries) bits.push(`Carries: ${carries}.`);
  if (traits) bits.push(`Sinergias: ${traits}.`);
  return clamp(bits.join(" "));
}

/**
 * Per-comp metadata (US-023): title, description, canonical URL and Open Graph /
 * Twitter cards carrying the tier and set/patch. The Open Graph / Twitter images
 * come from the sibling `opengraph-image.tsx` / `twitter-image.tsx` files.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { comp } = await getCompData(slug);

  if (!comp) {
    return {
      title: "Comp não encontrada",
      robots: { index: false, follow: false },
    };
  }

  const tierLabel = TIER_META[comp.tier].label;
  const patch = compPatchVersion(comp);
  const title = `${comp.name} — ${tierLabel}`;
  const ogTitle = `${comp.name} — ${tierLabel} · TFT ${comp.set} (patch ${patch})`;
  const description = buildCompDescription(comp);
  const canonical = `/comps/${comp.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: ogTitle,
      description,
      publishedTime: comp.publishedAt ? toIso(comp.publishedAt) : undefined,
      modifiedTime: toIso(comp.updatedAt),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default async function CompDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { comp, currentPatchId, synergies } = await getCompData(slug);

  if (!comp) {
    notFound();
  }

  // Basic JSON-LD (US-023): the comp guide as an Article so search engines get
  // structured title/description/dates. Embedded as a script tag on the page.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${comp.name} — ${TIER_META[comp.tier].label}`,
    description: buildCompDescription(comp),
    inLanguage: "pt-BR",
    about: "Teamfight Tactics",
    datePublished: toIso(comp.publishedAt ?? comp.createdAt),
    dateModified: toIso(comp.updatedAt),
    mainEntityOfPage: absoluteUrl(`/comps/${comp.slug}`),
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Record opening a comp (US-041). */}
      <TrackEvent
        name={ANALYTICS_EVENTS.compOpen}
        props={{ slug: comp.slug, tier: comp.tier }}
      />
      <CompHeader comp={comp} currentPatchId={currentPatchId} />
      <div className="mt-6">
        <OpenInBuilder comp={comp} />
      </div>
      {/* Two-column guide layout (tftips-style): the visual roster (board,
          carries, items, augments) on the left; the written guide + unit lists
          on the right. Collapses to a single column below lg. */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <CompBoard units={comp.units} synergies={synergies} />
          <CompCarries carries={comp.carries} />
          <CompItemPriority items={comp.itemPriority} />
          <CompAugments
            augments={comp.augments}
            augmentPriority={comp.augmentPriority}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <CompGuide comp={comp} />
        </div>
      </div>
    </article>
  );
}
