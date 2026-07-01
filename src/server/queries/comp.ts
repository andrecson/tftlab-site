/**
 * Public comp-detail read (US-012).
 *
 * `getCompBySlug` returns a single PUBLISHED comp with everything the detail
 * page renders: traits, units (with equipped items and board position), overall
 * item priority, augments, both patch relations and the guide (guide fields are
 * scalars on Comp, so they come back automatically). Unpublished comps (draft/
 * archived) resolve to null so the page can 404. Uses the PrismaClient singleton.
 */
import { Prisma } from "@prisma/client";

import { db } from "@/server/db";

const compDetailInclude = Prisma.validator<Prisma.CompInclude>()({
  patchIntroduced: true,
  patchUpdated: true,
  traits: {
    orderBy: { order: "asc" },
    include: { trait: true },
  },
  units: {
    orderBy: { order: "asc" },
    include: {
      champion: true,
      items: {
        orderBy: { order: "asc" },
        include: { item: true },
      },
    },
  },
  itemPriority: {
    orderBy: { order: "asc" },
    include: { item: true },
  },
  augments: {
    orderBy: { order: "asc" },
    include: { augment: true },
  },
});

/** A PUBLISHED comp with its full nested content for the detail page. */
export type CompDetail = Prisma.CompGetPayload<{ include: typeof compDetailInclude }>;

/**
 * Fetch a single PUBLISHED comp by its slug with all nested content. Returns
 * null when no comp matches or the comp is not published (draft/archived), so
 * the caller can render a 404. Slug is unique, so at most one row matches.
 */
export function getCompBySlug(slug: string): Promise<CompDetail | null> {
  return db.comp.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: compDetailInclude,
  });
}

/**
 * Every PUBLISHED comp slug, for `generateStaticParams` on the comp-detail
 * route (US-017) and the sitemap (US-023). Not scoped to the current set — each
 * published comp gets its own statically generated page.
 */
export async function getPublishedCompSlugs(): Promise<string[]> {
  const comps = await db.comp.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return comps.map((comp) => comp.slug);
}

/** A PUBLISHED comp's slug + last-modified time, for the sitemap (US-023). */
export type SitemapComp = { slug: string; updatedAt: Date };

/**
 * Every PUBLISHED comp with the fields the sitemap needs (`slug` for the URL,
 * `updatedAt` for `<lastmod>`). Drafts/archived are excluded so the sitemap only
 * lists indexable pages. Ordered most-recently-updated first.
 */
export function getPublishedCompsForSitemap(): Promise<SitemapComp[]> {
  return db.comp.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}
