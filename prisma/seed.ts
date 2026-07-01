/**
 * Seed: catalog (US-009) + patch / SiteConfig / sample comps (US-010).
 *
 * 1. Imports the current set's Champion / Item / Trait / Augment catalog from
 *    Data Dragon (Community Dragon TFT export) and links champions to traits.
 * 2. Upserts the current + previous Patch and the singleton SiteConfig.
 * 3. Builds >=3 PUBLISHED sample comps (different tiers) referencing the real
 *    seeded catalog, each with traits, early/core/flex units, carries + items,
 *    item priority, augments + augmentPriority, board positions and a full
 *    guide. One comp is introduced in the current patch (badge "Novo") and one
 *    is updated in the current patch (badge "Atualizado").
 *
 * Idempotent: catalog rows upsert on `apiId` + `set`; patches upsert on
 * `version`; SiteConfig on id=1; sample comps are deleted by slug and recreated.
 * Run it with: npx prisma db seed (alias: npm run db:seed).
 */
import { db } from "../src/server/db";
import { getCatalog } from "../src/server/ddragon";

// Literal unions that mirror the Prisma enums (structurally assignable to them,
// so no @prisma/client enum import is needed).
type Role = "EARLY" | "CORE" | "FLEX";
type Category = "ECON" | "ITEMS" | "COMBAT";
type TierName = "S" | "A" | "B" | "C" | "X";
type DifficultyName = "EASY" | "MEDIUM" | "HARD";

/** Run an async op over `rows` in bounded-concurrency batches. */
async function inBatches<T>(rows: T[], size: number, op: (row: T) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await Promise.all(rows.slice(i, i + size).map(op));
  }
}

// --- Catalog import (US-009) -------------------------------------------------

/** Import the current set's catalog into the DB; returns the set token/number. */
async function seedCatalog(): Promise<{ set: string; setNumber: number }> {
  console.log("Fetching TFT catalog from Data Dragon...");
  const catalog = await getCatalog();
  const { set } = catalog;
  console.log(
    `Set ${catalog.setNumber} (${set}): ` +
      `${catalog.champions.length} champions, ${catalog.traits.length} traits, ` +
      `${catalog.items.length} items, ${catalog.augments.length} augments`,
  );

  // Traits first so champions can resolve their trait ids. Upsert is keyed by
  // apiId, so each trait's row id is stable across runs; build apiId -> id.
  const traitIdByApiId = new Map<string, string>();
  await inBatches(catalog.traits, 25, async (t) => {
    const row = await db.trait.upsert({
      where: { apiId_set: { apiId: t.apiId, set } },
      create: { apiId: t.apiId, name: t.name, iconUrl: t.iconUrl, set, breakpoints: t.breakpoints },
      update: { name: t.name, iconUrl: t.iconUrl, breakpoints: t.breakpoints },
    });
    traitIdByApiId.set(t.apiId, row.id);
  });

  // Champions reference traits by display NAME, and a few names map to several
  // trait variants (e.g. Set 17's "Stargazer" has 8 constellation apiIds). Pin
  // each name to one canonical apiId deterministically (shortest apiId, then
  // lexicographic => the base trait) so champion<->trait links are identical on
  // every re-seed (idempotency). Resolving by name with a non-deterministic
  // winner would silently accumulate duplicate ChampionTrait rows.
  const canonicalApiIdByTraitName = new Map<string, string>();
  for (const t of catalog.traits) {
    const current = canonicalApiIdByTraitName.get(t.name);
    if (
      current === undefined ||
      t.apiId.length < current.length ||
      (t.apiId.length === current.length && t.apiId < current)
    ) {
      canonicalApiIdByTraitName.set(t.name, t.apiId);
    }
  }

  await inBatches(catalog.items, 25, (it) =>
    db.item.upsert({
      where: { apiId_set: { apiId: it.apiId, set } },
      create: { apiId: it.apiId, name: it.name, iconUrl: it.iconUrl, type: it.type, set },
      update: { name: it.name, iconUrl: it.iconUrl, type: it.type },
    }),
  );

  await inBatches(catalog.augments, 25, (a) =>
    db.augment.upsert({
      where: { apiId_set: { apiId: a.apiId, set } },
      create: { apiId: a.apiId, name: a.name, iconUrl: a.iconUrl, tier: a.tier, set },
      update: { name: a.name, iconUrl: a.iconUrl, tier: a.tier },
    }),
  );

  // Champions + their ChampionTrait edges.
  let linkCount = 0;
  await inBatches(catalog.champions, 20, async (c) => {
    const champion = await db.champion.upsert({
      where: { apiId_set: { apiId: c.apiId, set } },
      create: { apiId: c.apiId, name: c.name, cost: c.cost, iconUrl: c.iconUrl, set },
      update: { name: c.name, cost: c.cost, iconUrl: c.iconUrl },
    });
    for (const traitName of c.traitNames) {
      const apiId = canonicalApiIdByTraitName.get(traitName);
      const traitId = apiId ? traitIdByApiId.get(apiId) : undefined;
      if (!traitId) continue; // trait not in catalog (should not happen for current set)
      await db.championTrait.upsert({
        where: { championId_traitId: { championId: champion.id, traitId } },
        create: { championId: champion.id, traitId },
        update: {},
      });
      linkCount++;
    }
  });

  const [champions, items, traits, augments, championTraits] = await Promise.all([
    db.champion.count({ where: { set } }),
    db.item.count({ where: { set } }),
    db.trait.count({ where: { set } }),
    db.augment.count({ where: { set } }),
    db.championTrait.count(),
  ]);
  console.log(
    `Seeded catalog (set ${set}) -> champions: ${champions}, items: ${items}, traits: ${traits}, ` +
      `augments: ${augments}, championTraits: ${championTraits} (${linkCount} links written)`,
  );

  return { set, setNumber: catalog.setNumber };
}

// --- Sample data (US-010) ----------------------------------------------------

function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Rotate an array left by `k` (wraps), so each comp picks a different slice. */
function rotate<T>(arr: T[], k: number): T[] {
  if (arr.length === 0) return arr;
  const n = ((k % arr.length) + arr.length) % arr.length;
  return arr.slice(n).concat(arr.slice(0, n));
}

// The 7 board hexes used for CORE units (4x7 hex grid). Front rows are tanks,
// the back row (row 3) holds the carries.
const CORE_HEXES: { row: number; col: number }[] = [
  { row: 0, col: 1 },
  { row: 0, col: 3 },
  { row: 0, col: 5 },
  { row: 1, col: 2 },
  { row: 1, col: 4 },
  { row: 3, col: 2 },
  { row: 3, col: 4 },
];

interface PlannedUnit {
  championId: string;
  role: Role;
  isCarry: boolean;
  carryOrder: number | null;
  starLevel: number | null;
  boardRow: number | null;
  boardCol: number | null;
  order: number;
  items: { itemId: string; order: number }[];
}

interface CompSpec {
  tier: TierName;
  difficulty: DifficultyName;
  playstyle: string;
  badge: "novo" | "atualizado" | "none";
  categories: Category[];
}

const COMP_SPECS: CompSpec[] = [
  { tier: "S", difficulty: "HARD", playstyle: "Fast 8", badge: "novo", categories: ["ECON", "ITEMS", "COMBAT"] },
  { tier: "A", difficulty: "MEDIUM", playstyle: "Slow Roll", badge: "atualizado", categories: ["COMBAT", "ITEMS", "ECON"] },
  { tier: "B", difficulty: "EASY", playstyle: "Reroll", badge: "none", categories: ["ITEMS", "ECON", "COMBAT"] },
];

function buildGuide(name: string, carry: string, topTrait: string, earlyNames: string[], coreNames: string[]) {
  return {
    whenToPlay:
      `Jogue ${name} quando abrir com componentes para ${carry} ou tiver um inicio forte de ${topTrait}. ` +
      `E uma composicao do meta atual, ideal quando o lobby nao esta contestando ${topTrait} e voce ` +
      `consegue rolar mantendo a economia saudavel.`,
    earlyGame:
      `Priorize unidades de ${topTrait} no inicio (${earlyNames.join(", ")}). Segure vida alta, foque em ` +
      `economia e va ganhando as rodadas com a melhor frontline disponivel enquanto monta os itens de ${carry}.`,
    midGame:
      `No meio de jogo, estabilize com a board de ${topTrait} e procure as pecas centrais ` +
      `(${coreNames.slice(0, 3).join(", ")}). Suba de nivel de forma constante e role apenas para estabilizar ` +
      `caso a vida fique baixa.`,
    lateGame:
      `No fim de jogo, complete a composicao em torno de ${carry} (3 estrelas quando possivel) e finalize ` +
      `${topTrait}. Posicione o carry protegido na linha de tras e ajuste o posicionamento conforme as ` +
      `ameacas do lobby.`,
    tips:
      `Dica: ${carry} e o carry principal — entregue os itens de prioridade nele primeiro. Use os augments ` +
      `recomendados para acelerar a curva e adapte o posicionamento contra assassinos.`,
  };
}

/** Create the current/previous patch, SiteConfig and sample comps. */
async function seedSampleData(set: string, setNumber: number): Promise<void> {
  console.log("Seeding patch, SiteConfig and sample comps...");

  const previousPatch = await db.patch.upsert({
    where: { version: `${setNumber}.1` },
    update: { set, releasedAt: new Date("2026-06-01T00:00:00.000Z") },
    create: { version: `${setNumber}.1`, set, releasedAt: new Date("2026-06-01T00:00:00.000Z") },
  });
  const currentPatch = await db.patch.upsert({
    where: { version: `${setNumber}.2` },
    update: { set, releasedAt: new Date("2026-06-15T00:00:00.000Z") },
    create: { version: `${setNumber}.2`, set, releasedAt: new Date("2026-06-15T00:00:00.000Z") },
  });

  await db.siteConfig.upsert({
    where: { id: 1 },
    update: { currentSet: set, currentPatchId: currentPatch.id },
    create: { id: 1, currentSet: set, currentPatchId: currentPatch.id },
  });

  // Catalog pools (deterministic order so re-seeds are stable).
  const champions = await db.champion.findMany({
    where: { set },
    orderBy: { apiId: "asc" },
    include: { traits: { include: { trait: true } } },
  });
  const completed = await db.item.findMany({
    where: { set, type: "COMPLETED" },
    orderBy: { apiId: "asc" },
  });
  const itemPool =
    completed.length >= 8
      ? completed
      : await db.item.findMany({ where: { set }, orderBy: { apiId: "asc" }, take: 20 });
  const augmentPool = await db.augment.findMany({ where: { set }, orderBy: { apiId: "asc" } });

  if (champions.length < COMP_SPECS.length * 12 || itemPool.length < 6 || augmentPool.length < 9) {
    throw new Error(
      "Not enough catalog data to build sample comps — run the catalog seed first " +
        `(have ${champions.length} champions, ${itemPool.length} items, ${augmentPool.length} augments).`,
    );
  }

  const usedSlugs = new Set<string>();
  const uniqueSlug = (base: string): string => {
    const root = base || "comp";
    let s = root;
    let n = 2;
    while (usedSlugs.has(s)) s = `${root}-${n++}`;
    usedSlugs.add(s);
    return s;
  };

  const created: string[] = [];

  for (let i = 0; i < COMP_SPECS.length; i++) {
    const spec = COMP_SPECS[i];

    // 12 distinct champions per comp (disjoint windows), sorted by cost so the
    // cheapest become EARLY units and the most expensive become the carries.
    const window = champions.slice(i * 12, i * 12 + 12);
    const group = [...window].sort((a, b) => a.cost - b.cost || a.apiId.localeCompare(b.apiId));
    const early = group.slice(0, 3);
    const flex = group.slice(3, 5);
    const core = group.slice(5, 12); // 7 board units, last two are carries

    // Active-ish traits: count units carrying each trait, take the top few.
    const traitCounts = new Map<string, { id: string; name: string; count: number }>();
    for (const c of group) {
      for (const ct of c.traits) {
        const t = ct.trait;
        const entry = traitCounts.get(t.id) ?? { id: t.id, name: t.name, count: 0 };
        entry.count++;
        traitCounts.set(t.id, entry);
      }
    }
    const topTraits = [...traitCounts.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 4);

    const primaryCarry = core[core.length - 1];
    const topTraitName = topTraits[0]?.name ?? primaryCarry.name;
    const name = `${topTraitName} ${primaryCarry.name}`;
    const slug = uniqueSlug(slugify(name));

    // Item / augment slices (rotated per comp so comps differ).
    const rotatedItems = rotate(itemPool, i * 6);
    const carryItems = (carryIdx: number) =>
      rotatedItems
        .slice(carryIdx * 3, carryIdx * 3 + 3)
        .map((it, k) => ({ itemId: it.id, order: k }));

    const units: PlannedUnit[] = [];
    let order = 0;
    for (const c of early) {
      units.push({
        championId: c.id,
        role: "EARLY",
        isCarry: false,
        carryOrder: null,
        starLevel: 1,
        boardRow: null,
        boardCol: null,
        order: order++,
        items: [],
      });
    }
    core.forEach((c, k) => {
      const isCarry = k >= core.length - 2; // last two CORE units are carries
      const carryIdx = isCarry ? k - (core.length - 2) : -1;
      units.push({
        championId: c.id,
        role: "CORE",
        isCarry,
        carryOrder: isCarry ? carryIdx : null,
        starLevel: isCarry ? 3 : 2,
        boardRow: CORE_HEXES[k].row,
        boardCol: CORE_HEXES[k].col,
        order: order++,
        items: isCarry ? carryItems(carryIdx) : [],
      });
    });
    for (const c of flex) {
      units.push({
        championId: c.id,
        role: "FLEX",
        isCarry: false,
        carryOrder: null,
        starLevel: 2,
        boardRow: null,
        boardCol: null,
        order: order++,
        items: [],
      });
    }

    const itemPriority = rotatedItems.slice(0, 4).map((it, k) => ({ itemId: it.id, order: k }));
    const augments = rotate(augmentPool, i * 3)
      .slice(0, 3)
      .map((a, k) => ({ augmentId: a.id, order: k }));

    const patchIntroducedId = spec.badge === "novo" ? currentPatch.id : previousPatch.id;
    const patchUpdatedId = spec.badge === "atualizado" ? currentPatch.id : null;
    const publishedAt =
      spec.badge === "novo" ? currentPatch.releasedAt : previousPatch.releasedAt;

    const guide = buildGuide(
      name,
      primaryCarry.name,
      topTraitName,
      early.map((c) => c.name),
      core.map((c) => c.name),
    );

    // Idempotent: drop any existing comp with this slug (cascades children).
    await db.comp.deleteMany({ where: { slug } });
    await db.comp.create({
      data: {
        slug,
        name,
        set,
        tier: spec.tier,
        situational: false,
        status: "PUBLISHED",
        playstyle: spec.playstyle,
        difficulty: spec.difficulty,
        whenToPlay: guide.whenToPlay,
        earlyGame: guide.earlyGame,
        midGame: guide.midGame,
        lateGame: guide.lateGame,
        tips: guide.tips,
        augmentPriority: spec.categories,
        publishedAt,
        patchIntroduced: { connect: { id: patchIntroducedId } },
        ...(patchUpdatedId ? { patchUpdated: { connect: { id: patchUpdatedId } } } : {}),
        traits: {
          create: topTraits.map((t, idx) => ({
            trait: { connect: { id: t.id } },
            level: t.count,
            order: idx,
          })),
        },
        units: {
          create: units.map((u) => ({
            champion: { connect: { id: u.championId } },
            role: u.role,
            isCarry: u.isCarry,
            carryOrder: u.carryOrder,
            starLevel: u.starLevel,
            boardRow: u.boardRow,
            boardCol: u.boardCol,
            order: u.order,
            items: { create: u.items.map((it) => ({ item: { connect: { id: it.itemId } }, order: it.order })) },
          })),
        },
        itemPriority: {
          create: itemPriority.map((ip) => ({ item: { connect: { id: ip.itemId } }, order: ip.order })),
        },
        augments: {
          create: augments.map((a) => ({ augment: { connect: { id: a.augmentId } }, order: a.order })),
        },
      },
    });

    created.push(`${slug} (tier ${spec.tier}, ${spec.badge})`);
  }

  console.log(
    `Patches: ${previousPatch.version} (previous) + ${currentPatch.version} (current); ` +
      `SiteConfig.currentSet=${set}.`,
  );
  console.log(`Seeded ${created.length} PUBLISHED sample comps: ${created.join("; ")}.`);
}

// --- Entry point -------------------------------------------------------------

async function main(): Promise<void> {
  const { set, setNumber } = await seedCatalog();
  await seedSampleData(set, setNumber);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
