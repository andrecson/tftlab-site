/**
 * Admin dashboard reads (US-031).
 *
 * Server-only. Unlike the public queries these are NOT wrapped in
 * `unstable_cache` — the admin shell is `force-dynamic` and must always show
 * live counts (a curator publishing/archiving needs the numbers to move
 * immediately). Uses the shared PrismaClient singleton.
 */
import {
  Prisma,
  UnitRole,
  type AugmentCategory,
  type CompStatus,
} from "@prisma/client";
import { groupByTier, type TierGroup } from "@/lib/tiers";
import { db } from "@/server/db";
import { compDetailInclude, type CompDetail } from "@/server/queries/comp";
import { getSiteConfig } from "@/server/queries/config";

/** Aggregate numbers + current-patch context shown on the admin dashboard. */
export interface AdminDashboardStats {
  /** Comps in DRAFT status for the current set (the curator's work queue). */
  draftCount: number;
  /** Published comps for the current set (live on the tier list). */
  publishedCount: number;
  /** Archived comps for the current set. */
  archivedCount: number;
  /** Current set token (e.g. "TFTSet17"); null before SiteConfig is seeded. */
  currentSet: string | null;
  /** Current patch version + release date; null before a patch is configured. */
  currentPatch: { version: string; releasedAt: Date } | null;
}

/**
 * Read the counts + current-set/patch shown on `/admin`. Counts are scoped to
 * the current set so they reflect the patch the curator is working on; when no
 * set is configured yet they fall back to counting across all sets so a fresh
 * install still shows meaningful totals.
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const config = await getSiteConfig();
  const set = config?.currentSet ?? null;
  const scope = set ? { set } : {};

  const [draftCount, publishedCount, archivedCount] = await Promise.all([
    db.comp.count({ where: { ...scope, status: "DRAFT" } }),
    db.comp.count({ where: { ...scope, status: "PUBLISHED" } }),
    db.comp.count({ where: { ...scope, status: "ARCHIVED" } }),
  ]);

  return {
    draftCount,
    publishedCount,
    archivedCount,
    currentSet: set,
    currentPatch: config?.currentPatch
      ? {
          version: config.currentPatch.version,
          releasedAt: config.currentPatch.releasedAt,
        }
      : null,
  };
}

/**
 * Lean projection for the admin comps list (US-033): everything a curator needs
 * to scan/manage a comp (name, slug, tier, status, patch stamps, last edit)
 * without loading the full unit/item/augment tree. `Prisma.validator` keeps the
 * derived row type exact (see src/server/CLAUDE.md — a plain object widens
 * `select` and breaks `CompGetPayload`).
 */
const adminCompSelect = Prisma.validator<Prisma.CompSelect>()({
  id: true,
  slug: true,
  name: true,
  tier: true,
  status: true,
  situational: true,
  updatedAt: true,
  patchIntroduced: { select: { version: true } },
  patchUpdated: { select: { version: true } },
});

/** A single row in the admin comps list. */
export type AdminCompRow = Prisma.CompGetPayload<{
  select: typeof adminCompSelect;
}>;

/**
 * List comps for the admin management table (US-033). Scoped to the current set
 * (falling back to all sets when unconfigured, mirroring the dashboard counts),
 * optionally filtered to a single `status`. Ordered most-recently-edited first
 * so a curator's active work floats to the top. Like the dashboard stats this
 * is NOT `unstable_cache`'d — the admin shell is `force-dynamic` and the list
 * must reflect edits/publishes immediately.
 */
export async function getAdminComps(
  status?: CompStatus,
): Promise<AdminCompRow[]> {
  const config = await getSiteConfig();
  const set = config?.currentSet ?? null;

  return db.comp.findMany({
    where: {
      ...(set ? { set } : {}),
      ...(status ? { status } : {}),
    },
    select: adminCompSelect,
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Lean projection for the admin tier-list editor (US-046): just what a
 * draggable/selectable tier card needs. `status` is included so the editor can
 * badge DRAFT/ARCHIVED comps that appear alongside the live ones.
 */
const adminTierListSelect = Prisma.validator<Prisma.CompSelect>()({
  id: true,
  name: true,
  slug: true,
  tier: true,
  situational: true,
  status: true,
});

/** A single comp row in the admin tier-list editor. */
export type AdminTierListComp = Prisma.CompGetPayload<{
  select: typeof adminTierListSelect;
}>;

/**
 * List the current set's comps grouped into the S/A/B/C/X tier bands for the
 * admin tier-list editor (US-046). ALL statuses are returned — a curator can
 * retier a draft before it goes live — so the projection carries `status` for
 * the UI to mark which comps are published. Set-scoped like the other admin
 * queries (falling back to all sets when unconfigured) and NOT `unstable_cache`'d
 * (admin is force-dynamic, so a retier must reflect immediately). Reuses the
 * shared `groupByTier` — the same grouping the public tier list uses — so every
 * band is present in display order, even when empty.
 */
export async function getAdminTierListComps(): Promise<
  TierGroup<AdminTierListComp>[]
> {
  const config = await getSiteConfig();
  const set = config?.currentSet ?? null;

  const comps = await db.comp.findMany({
    where: set ? { set } : {},
    select: adminTierListSelect,
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });

  return groupByTier(comps);
}

/**
 * Base + guide fields the comp form (US-034) needs to edit a comp. Not
 * set-scoped (edit by id, whatever set) and NOT `unstable_cache`'d — admin is
 * force-dynamic. Traits/units/items/augments are edited by their own stories
 * (US-035..037) so they're intentionally excluded here.
 */
const adminCompEditSelect = Prisma.validator<Prisma.CompSelect>()({
  id: true,
  slug: true,
  name: true,
  set: true,
  tier: true,
  situational: true,
  status: true,
  playstyle: true,
  difficulty: true,
  whenToPlay: true,
  earlyGame: true,
  midGame: true,
  lateGame: true,
  tips: true,
  patchIntroducedId: true,
  patchUpdatedId: true,
  coverChampionId: true,
});

/** A comp's editable base fields (US-034 form). */
export type AdminCompEdit = Prisma.CompGetPayload<{
  select: typeof adminCompEditSelect;
}>;

/** Load one comp's base/guide fields for the edit form; null if not found. */
export async function getAdminCompById(
  id: string,
): Promise<AdminCompEdit | null> {
  return db.comp.findUnique({ where: { id }, select: adminCompEditSelect });
}

/**
 * Load a comp by id with its FULL nested content (US-040 draft preview), reusing
 * the public `compDetailInclude` so the preview renders through the same
 * comp-detail section components. Unlike `getCompBySlug` this does NOT filter on
 * `status`, so DRAFT/ARCHIVED comps resolve too — the whole point of the
 * curator preview. Returns null when the id doesn't match. NOT `unstable_cache`'d
 * (admin is force-dynamic; a curator must see unpublished edits immediately) and
 * only reachable behind the `(admin)` group's `requireRole` guard.
 */
export function getAdminCompForPreview(id: string): Promise<CompDetail | null> {
  return db.comp.findUnique({ where: { id }, include: compDetailInclude });
}

/** A comp's trait row for the traits editor (US-035): trait + active level. */
export interface AdminCompTraitRow {
  traitId: string;
  level: number;
}

/**
 * The trait list + off-board (EARLY/FLEX) unit lists a curator edits in US-035.
 * CORE (on-board) units are managed by the builder (US-037) and are intentionally
 * excluded here, so this editor never touches board positioning/items.
 */
export interface AdminCompComposition {
  /** Traits with their active level, in display order. */
  traits: AdminCompTraitRow[];
  /** Champion ids of the EARLY units, in order. */
  earlyUnitIds: string[];
  /** Champion ids of the FLEX units, in order. */
  flexUnitIds: string[];
}

/**
 * Load a comp's editable composition (US-035): its `CompTrait`s (trait + level,
 * ordered) and its off-board EARLY/FLEX `CompUnit`s (champion ids per role,
 * ordered). NOT set-scoped (edit by id) and NOT `unstable_cache`'d — admin is
 * force-dynamic. CORE units are excluded (US-037's builder owns the board).
 */
export async function getAdminCompComposition(
  compId: string,
): Promise<AdminCompComposition> {
  const [traits, units] = await Promise.all([
    db.compTrait.findMany({
      where: { compId },
      select: { traitId: true, level: true },
      orderBy: { order: "asc" },
    }),
    db.compUnit.findMany({
      where: { compId, role: { in: [UnitRole.EARLY, UnitRole.FLEX] } },
      select: { championId: true, role: true },
      orderBy: { order: "asc" },
    }),
  ]);

  return {
    traits: traits.map((t) => ({ traitId: t.traitId, level: t.level })),
    earlyUnitIds: units
      .filter((u) => u.role === UnitRole.EARLY)
      .map((u) => u.championId),
    flexUnitIds: units
      .filter((u) => u.role === UnitRole.FLEX)
      .map((u) => u.championId),
  };
}

/** One carry as loaded into the carries editor (champion + stars + item ids). */
export interface AdminCompCarry {
  championId: string;
  starLevel: number;
  itemIds: string[];
}

/** Load a comp's editable carries (ordered) for the carries admin form. */
export async function getAdminCompCarries(
  compId: string,
): Promise<AdminCompCarry[]> {
  const carries = await db.compCarry.findMany({
    where: { compId },
    orderBy: { order: "asc" },
    select: {
      championId: true,
      starLevel: true,
      items: { orderBy: { order: "asc" }, select: { itemId: true } },
    },
  });
  return carries.map((c) => ({
    championId: c.championId,
    starLevel: c.starLevel,
    itemIds: c.items.map((it) => it.itemId),
  }));
}

/** Load a comp's recommended augment ids (ordered) for the augments admin form. */
export async function getAdminCompAugments(compId: string): Promise<string[]> {
  const augments = await db.compAugment.findMany({
    where: { compId },
    orderBy: { order: "asc" },
    select: { augmentId: true },
  });
  return augments.map((a) => a.augmentId);
}

/** Load a comp's chosen situational-badge item/augment ids for the badge form. */
export async function getAdminCompSituationalBadge(
  compId: string,
): Promise<{ itemId: string | null; augmentId: string | null }> {
  const comp = await db.comp.findUnique({
    where: { id: compId },
    select: { situationalItemId: true, situationalAugmentId: true },
  });
  return {
    itemId: comp?.situationalItemId ?? null,
    augmentId: comp?.situationalAugmentId ?? null,
  };
}

/**
 * The general item priority + augment-category priority a curator edits in
 * US-036. The recommended augments themselves (`CompAugment`) and the final CORE
 * board belong to the builder (US-037); this editor owns only the ordered item
 * priority list and the ordered `ECON/ITEMS/COMBAT` category preference.
 */
export interface AdminCompPriority {
  /** Item ids of the overall item priority, in order. */
  itemIds: string[];
  /** Augment categories in priority order (a subset/ordering of the enum). */
  augmentPriority: AugmentCategory[];
}

/**
 * Load a comp's editable priority (US-036): its `CompItemPriority` rows (item
 * ids, ordered) plus the comp's `augmentPriority` array. NOT set-scoped (edit by
 * id) and NOT `unstable_cache`'d — admin is force-dynamic. Returns empty
 * lists when the comp is missing so the editor renders a clean slate.
 */
export async function getAdminCompPriority(
  compId: string,
): Promise<AdminCompPriority> {
  const [items, comp] = await Promise.all([
    db.compItemPriority.findMany({
      where: { compId },
      select: { itemId: true },
      orderBy: { order: "asc" },
    }),
    db.comp.findUnique({
      where: { id: compId },
      select: { augmentPriority: true },
    }),
  ]);

  return {
    itemIds: items.map((i) => i.itemId),
    augmentPriority: comp?.augmentPriority ?? [],
  };
}

/** One on-board CORE unit as the admin builder loads it (US-037). */
export interface AdminCompBoardUnit {
  championId: string;
  /** 0-based board row. */
  row: number;
  /** 0-based board column. */
  col: number;
  /** 1–3 star level (defaults to 1 when unset). */
  stars: number;
  isCarry: boolean;
  /** Equipped item ids, in slot order. */
  items: string[];
}

/** The comp's final board (CORE units + recommended augments) for the builder. */
export interface AdminCompBoard {
  units: AdminCompBoardUnit[];
  augmentIds: string[];
}

/**
 * Load a comp's final board (US-037): its on-board CORE `CompUnit`s (position,
 * stars, carry flag, equipped items) and its recommended `CompAugment`s, both
 * ordered. Only CORE units with a board position are returned — off-board
 * EARLY/FLEX units belong to the composition editor (US-035). NOT set-scoped
 * (edit by id) and NOT `unstable_cache`'d — admin is force-dynamic.
 */
export async function getAdminCompBoard(
  compId: string,
): Promise<AdminCompBoard> {
  const [units, augments] = await Promise.all([
    db.compUnit.findMany({
      where: {
        compId,
        role: UnitRole.CORE,
        boardRow: { not: null },
        boardCol: { not: null },
      },
      select: {
        championId: true,
        boardRow: true,
        boardCol: true,
        starLevel: true,
        isCarry: true,
        items: { select: { itemId: true }, orderBy: { order: "asc" } },
      },
      orderBy: { order: "asc" },
    }),
    db.compAugment.findMany({
      where: { compId },
      select: { augmentId: true },
      orderBy: { order: "asc" },
    }),
  ]);

  return {
    units: units.map((u) => ({
      championId: u.championId,
      // Non-null by the query filter, but `select` still types them nullable.
      row: u.boardRow as number,
      col: u.boardCol as number,
      stars: u.starLevel ?? 1,
      isCarry: u.isCarry,
      items: u.items.map((it) => it.itemId),
    })),
    augmentIds: augments.map((a) => a.augmentId),
  };
}

/** A patch option for the comp form's introduced/updated selects. */
export interface PatchOption {
  id: string;
  version: string;
}

/**
 * All patches (newest first) for the comp form's patch selects. Patch
 * creation/current-patch selection is US-039; this is read-only.
 */
export async function getPatches(): Promise<PatchOption[]> {
  return db.patch.findMany({
    select: { id: true, version: true },
    orderBy: { releasedAt: "desc" },
  });
}

/** A patch row for the admin patches page (US-039). */
export interface AdminPatchRow {
  id: string;
  version: string;
  set: string;
  releasedAt: Date;
  /** How many comps were introduced in this patch (context for the curator). */
  compsIntroduced: number;
  /** Whether this patch is the site's current patch (SiteConfig). */
  isCurrent: boolean;
}

/** Everything the `/admin/patches` page needs (US-039). */
export interface AdminPatchesData {
  /** All patches, newest release first. */
  patches: AdminPatchRow[];
  /** The current patch id from SiteConfig (null before one is set). */
  currentPatchId: string | null;
  /** The current set token from SiteConfig (null before it's configured). */
  currentSet: string | null;
  /**
   * Published comps of the current set — the ones that get a `CompTierSnapshot`
   * stamped for the outgoing patch when the curator switches the current patch.
   */
  publishedCompCount: number;
}

/**
 * Load the patch-management data (US-039): every patch (with its introduced-comp
 * count and whether it's current), the current patch id/set, and the count of
 * published comps that would be snapshotted on a patch switch. NOT
 * `unstable_cache`'d — admin is force-dynamic.
 */
export async function getAdminPatchesData(): Promise<AdminPatchesData> {
  const config = await getSiteConfig();
  const currentPatchId = config?.currentPatchId ?? null;
  const currentSet = config?.currentSet ?? null;

  const [patches, publishedCompCount] = await Promise.all([
    db.patch.findMany({
      select: {
        id: true,
        version: true,
        set: true,
        releasedAt: true,
        _count: { select: { compsIntroduced: true } },
      },
      orderBy: { releasedAt: "desc" },
    }),
    db.comp.count({
      where: {
        status: "PUBLISHED",
        ...(currentSet ? { set: currentSet } : {}),
      },
    }),
  ]);

  return {
    patches: patches.map((p) => ({
      id: p.id,
      version: p.version,
      set: p.set,
      releasedAt: p.releasedAt,
      compsIntroduced: p._count.compsIntroduced,
      isCurrent: p.id === currentPatchId,
    })),
    currentPatchId,
    currentSet,
    publishedCompCount,
  };
}
