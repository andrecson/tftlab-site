/**
 * Site-wide constants for SEO / metadata (US-023).
 *
 * `SITE_URL` is the canonical absolute origin used for `metadataBase`, canonical
 * URLs, the sitemap, robots.txt and Open Graph tags. Override it per environment
 * with `NEXT_PUBLIC_SITE_URL` (documented in .env.example); it defaults to the
 * production domain. Any trailing slash is stripped so `absoluteUrl("/foo")`
 * never produces a double slash. Client-safe: no server-only imports here, so
 * both server and `"use client"` code may import these constants.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://tftlab.com.br"
).replace(/\/+$/, "");

/** Product name, used in titles and Open Graph `site_name`. */
export const SITE_NAME = "TFTLab";

/** Default site description (homepage + Open Graph fallback). */
export const SITE_DESCRIPTION =
  "Tier lists de composições de Teamfight Tactics (TFT): comps por tier, com itens, augments, posicionamento e guias de quando e como jogar.";

/** BCP-47 / Open Graph locale for the UI copy (pt-BR). */
export const SITE_LOCALE = "pt_BR";

/**
 * Build an absolute URL for a path (leading slash optional). Called with no
 * argument it returns the bare origin.
 */
export function absoluteUrl(path = ""): string {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
