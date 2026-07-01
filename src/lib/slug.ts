/**
 * Slug helper (US-034) — pure and client-safe (no imports), so the admin comp
 * form can preview a slug live in the browser while the `createComp`/`updateComp`
 * server actions canonicalize the SAME way on write. Mirrors the seed's slugify
 * (prisma/seed.ts) so public URLs stay consistent across seeded + admin-created
 * comps.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics (á -> a)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric -> hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}
