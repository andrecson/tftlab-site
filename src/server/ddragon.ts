/**
 * Data Dragon TFT catalog loader.
 *
 * SOURCE NOTE: Riot's classic Data Dragon TFT files
 * (`ddragon.leagueoflegends.com/.../tft-champion.json`, `tft-trait.json`, ...)
 * only expose id/name/cost/image. They do NOT carry trait breakpoints nor the
 * champion<->trait associations this app needs (synergy engine + builder).
 * Community Dragon publishes the full TFT export with exactly that data, so the
 * catalog is read from there. Asset (`.tex`) paths are rewritten to CDN PNG URLs.
 *
 * The "current set" is resolved dynamically as the highest-numbered mainline
 * set (mutator `TFTSet<number>` with no suffix), so this keeps working when a
 * new set ships without code changes.
 */

/** Community Dragon release channel: `latest` (live) or `pbe` (next patch). */
export type CdragonChannel = "latest" | "pbe";

const CDRAGON_ORIGIN = "https://raw.communitydragon.org";

/** TFT data export URL for a channel. */
export function cdragonTftDataUrl(channel: CdragonChannel = "latest"): string {
  return `${CDRAGON_ORIGIN}/${channel}/cdragon/tft/en_us.json`;
}

/** Game asset (icon) CDN base for a channel. */
function cdragonGameAssetBase(channel: CdragonChannel = "latest"): string {
  return `${CDRAGON_ORIGIN}/${channel}/game/`;
}

/** Back-compat: the live (latest) TFT data URL. */
export const CDRAGON_TFT_DATA_URL = cdragonTftDataUrl("latest");

/**
 * Official TFT team-planner champion list (keyed by set token, e.g. "TFTSet17").
 * Used to derive the in-game team-planner export codes (see src/lib/team-planner).
 */
export const CDRAGON_TEAMPLANNER_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/tftchampions-teamplanner.json";

export async function fetchTeamPlannerData(): Promise<
  Record<string, { character_id: string; team_planner_code: number }[]>
> {
  const res = await fetch(CDRAGON_TEAMPLANNER_URL);
  if (!res.ok) {
    throw new Error(`Team planner fetch failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as Record<
    string,
    { character_id: string; team_planner_code: number }[]
  >;
}

export type ItemTypeName =
  | "COMPONENT"
  | "COMPLETED"
  | "ARTIFACT"
  | "RADIANT"
  | "EMBLEM"
  | "SUPPORT"
  | "OTHER";

export interface CatalogChampion {
  apiId: string;
  name: string;
  cost: number;
  iconUrl: string;
  /** Trait display names (matched to CatalogTrait.name to build ChampionTrait). */
  traitNames: string[];
}

export interface CatalogTrait {
  apiId: string;
  name: string;
  iconUrl: string;
  /** Sorted, distinct unit counts that activate the trait, e.g. [2, 4, 6]. */
  breakpoints: number[];
}

export interface CatalogItem {
  apiId: string;
  name: string;
  iconUrl: string;
  type: ItemTypeName;
}

export interface CatalogAugment {
  apiId: string;
  name: string;
  iconUrl: string;
  /** Rarity (Silver/Gold/Prismatic) when derivable from the apiId, else null. */
  tier: string | null;
}

export interface Catalog {
  /** Canonical set token used as the `set` column everywhere, e.g. "TFTSet17". */
  set: string;
  setNumber: number;
  setName: string;
  champions: CatalogChampion[];
  traits: CatalogTrait[];
  items: CatalogItem[];
  augments: CatalogAugment[];
}

// --- Raw Community Dragon shapes (only the fields we read) --------------------

interface RawChampion {
  apiName?: string;
  name?: string;
  cost?: number;
  traits?: string[];
  icon?: string;
  tileIcon?: string;
  squareIcon?: string;
}

interface RawTrait {
  apiName?: string;
  name?: string;
  icon?: string;
  effects?: { minUnits?: number }[];
}

interface RawItem {
  apiName?: string;
  name?: string;
  icon?: string;
  composition?: string[];
}

interface RawSet {
  number?: number;
  name?: string;
  mutator?: string;
  champions?: RawChampion[];
  traits?: RawTrait[];
  /** apiIds of the augments in THIS set's pool (reused across sets). */
  augments?: string[];
}

interface RawTftData {
  items?: RawItem[];
  setData?: RawSet[];
}

// --- Helpers -----------------------------------------------------------------

/** Rewrite a Community Dragon `.tex`/`.dds` asset path to a servable CDN PNG. */
export function assetUrl(
  path?: string | null,
  base: string = cdragonGameAssetBase("latest"),
): string {
  if (!path) return "";
  return base + path.toLowerCase().replace(/\.(tex|dds)$/, ".png");
}

const hasText = (value?: string | null): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** Pick the current mainline set: highest-numbered `TFTSet<number>` mutator. */
export function pickCurrentSet(setData: RawSet[]): RawSet {
  const mains = setData.filter((s) => typeof s.mutator === "string" && /^TFTSet\d+$/.test(s.mutator));
  if (mains.length === 0) {
    throw new Error("No mainline TFT set (mutator TFTSet<number>) found in Data Dragon data");
  }
  return mains.reduce((best, candidate) =>
    Number(candidate.mutator!.slice(6)) > Number(best.mutator!.slice(6)) ? candidate : best,
  );
}

// Non-playable / mechanic / legacy item apiNames that should not enter the catalog.
const ITEM_JUNK =
  /Consumable|Grant|Debug|Test|Tutorial|Training|Blank|EmptyBag|EmptyTotem|Hex_|UNUSED|Placeholder|AcademyCopy|_Assist|Reforger|HexCore|Encounter|MarketOffering|Favored(Cause|Effect)|TFT_Item_Spatula$|FryingPan$/i;

function classifyItem(apiName: string, composition: string[], componentRefs: Set<string>): ItemTypeName {
  if (/Emblem/i.test(apiName)) return "EMBLEM";
  if (/Radiant/i.test(apiName)) return "RADIANT";
  if (/Artifact|Ornn/i.test(apiName)) return "ARTIFACT";
  if (/Support/i.test(apiName)) return "SUPPORT";
  if (composition.length >= 2) return "COMPLETED";
  if (componentRefs.has(apiName)) return "COMPONENT";
  return "OTHER";
}

/** Best-effort augment rarity from the `_I` / `_II` / `_III` apiId suffix. */
function augmentTier(apiName: string): string | null {
  if (/(_III|_3)$|Prismatic/i.test(apiName)) return "Prismatic";
  if (/(_II|_2)$|Gold/i.test(apiName)) return "Gold";
  if (/(_I|_1)$|Silver/i.test(apiName)) return "Silver";
  return null;
}

/** Augment display names sometimes carry inline HTML ("All Done<br><tftitemrules>…");
 * keep just the leading human-readable label. */
function cleanAugmentName(name: string): string {
  return name.split("<")[0].trim();
}

function dedupeByApiId<T extends { apiId: string }>(rows: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of rows) byId.set(row.apiId, row);
  return [...byId.values()];
}

async function fetchTftData(url: string): Promise<RawTftData> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Data Dragon fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  return (await res.json()) as RawTftData;
}

// --- Public API --------------------------------------------------------------

/**
 * Fetch and normalize the current set's catalog from Data Dragon (Community
 * Dragon TFT export). Pure transformation of remote data; performs no DB writes.
 */
export async function getCatalog(opts?: {
  channel?: CdragonChannel;
  url?: string;
}): Promise<Catalog> {
  const channel = opts?.channel ?? "latest";
  const assetBase = cdragonGameAssetBase(channel);
  const toAsset = (path?: string | null) => assetUrl(path, assetBase);
  const data = await fetchTftData(opts?.url ?? cdragonTftDataUrl(channel));
  const setData = data.setData ?? [];
  const set = pickCurrentSet(setData);
  const setNumber = Number(set.mutator!.slice(6));
  const setToken = `TFT${setNumber}`;

  const champions: CatalogChampion[] = (set.champions ?? [])
    .filter(
      (c) =>
        hasText(c.apiName) &&
        hasText(c.name) &&
        Array.isArray(c.traits) &&
        c.traits.length > 0 &&
        typeof c.cost === "number" &&
        c.cost >= 1 &&
        c.cost <= 7,
    )
    .map((c) => ({
      apiId: c.apiName!,
      name: c.name!.trim(),
      cost: c.cost!,
      iconUrl: toAsset(c.tileIcon || c.squareIcon || c.icon),
      traitNames: [...new Set(c.traits!)],
    }));

  const traits: CatalogTrait[] = (set.traits ?? [])
    .filter((t) => hasText(t.apiName) && hasText(t.name))
    .map((t) => ({
      apiId: t.apiName!,
      name: t.name!.trim(),
      iconUrl: toAsset(t.icon),
      breakpoints: [
        ...new Set(
          (t.effects ?? [])
            .map((e) => e.minUnits)
            .filter((n): n is number => typeof n === "number"),
        ),
      ].sort((a, b) => a - b),
    }));

  const inItemScope = (apiName: string) =>
    apiName.startsWith("TFT_Item_") ||
    apiName.startsWith(`${setToken}_`) ||
    apiName.startsWith(`${setToken}Item`);

  const itemCandidates = (data.items ?? []).filter(
    (i) =>
      hasText(i.apiName) &&
      hasText(i.name) &&
      inItemScope(i.apiName!) &&
      !/Augment/i.test(i.apiName!) &&
      !ITEM_JUNK.test(i.apiName!),
  );
  const componentRefs = new Set<string>();
  for (const i of itemCandidates) for (const c of i.composition ?? []) componentRefs.add(c);
  const items: CatalogItem[] = dedupeByApiId(
    itemCandidates.map((i) => ({
      apiId: i.apiName!,
      name: i.name!.trim(),
      iconUrl: toAsset(i.icon),
      type: classifyItem(i.apiName!, i.composition ?? [], componentRefs),
    })),
  );

  // The set lists its OWN augment pool (`set.augments`), reused across sets so
  // the prefixes vary (Set 17 includes TFT10_/TFT_ augments). Use that list as
  // the source of truth and resolve each apiId to its item (name + icon), rather
  // than guessing by `${setToken}_` prefix — which dropped ~80% of the pool.
  const itemByApiId = new Map<string, RawItem>();
  for (const i of data.items ?? []) {
    if (hasText(i.apiName)) itemByApiId.set(i.apiName!, i);
  }
  const augments: CatalogAugment[] = dedupeByApiId(
    (set.augments ?? [])
      .filter(
        (id) => hasText(id) && !/Debug|Test|Placeholder|UNUSED/i.test(id),
      )
      .map((id) => {
        const item = itemByApiId.get(id);
        const name =
          item && hasText(item.name) ? cleanAugmentName(item.name) : "";
        if (!name) return null;
        return {
          apiId: id,
          name,
          iconUrl: toAsset(item!.icon),
          tier: augmentTier(id),
        };
      })
      .filter((a): a is CatalogAugment => a !== null),
  );

  return {
    set: set.mutator!,
    setNumber,
    setName: set.name?.trim() || set.mutator!,
    champions,
    traits,
    items,
    augments,
  };
}
