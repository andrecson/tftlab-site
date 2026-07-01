/**
 * Site configuration reads (US-012).
 *
 * `SiteConfig` is a singleton row (id = 1) holding the global "current set /
 * current patch". Public queries scope to `currentSet` and derive Novo/
 * Atualizado badges from `currentPatchId`, so this is the single source of
 * truth for both. Uses the shared PrismaClient singleton.
 */
import { Prisma } from "@prisma/client";

import { db } from "@/server/db";

const siteConfigInclude = Prisma.validator<Prisma.SiteConfigInclude>()({
  currentPatch: true,
});

/** SiteConfig with its current `Patch` relation eagerly loaded. */
export type SiteConfigWithPatch = Prisma.SiteConfigGetPayload<{
  include: typeof siteConfigInclude;
}>;

/**
 * Read the singleton SiteConfig (id = 1) with its current patch. Returns null
 * before the config has been seeded — callers must handle the empty state.
 */
export function getSiteConfig(): Promise<SiteConfigWithPatch | null> {
  return db.siteConfig.findUnique({
    where: { id: 1 },
    include: siteConfigInclude,
  });
}

/** Resolve the current set token from SiteConfig (null if unconfigured). */
export async function getCurrentSet(): Promise<string | null> {
  const config = await getSiteConfig();
  return config?.currentSet ?? null;
}
