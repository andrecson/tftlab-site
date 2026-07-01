import { ImageResponse } from "next/og";
import type { Tier } from "@prisma/client";

import { getCompBySlug } from "@/server/queries/comp";
import { getSiteConfig } from "@/server/queries/config";

/**
 * Dynamic Open Graph image per comp (US-023), 1200×630. Rendered by `next/og`'s
 * `ImageResponse` (satori under the hood, so styles are flexbox-only inline
 * styles — no Tailwind/className, no grid). Shows the comp name, a tier badge in
 * the tier color, the set/patch and the carries. `twitter-image.tsx` re-exports
 * this so the Twitter card uses the same image.
 *
 * Runs in the default Node.js runtime (Prisma v6 needs it), so the DB read works.
 */
export const alt = "Composição de TFT no TFTLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Tier colors mirror the CSS tier tokens in globals.css (written as hex here
// because satori can't read CSS variables). X is the situational band.
const TIER_COLOR: Record<Tier, string> = {
  S: "#EF4343",
  A: "#F97415",
  B: "#E7B008",
  C: "#21C45D",
  X: "#7687A2",
};
const TIER_LABEL: Record<Tier, string> = {
  S: "S Tier",
  A: "A Tier",
  B: "B Tier",
  C: "C Tier",
  X: "Situacional",
};

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [comp, config] = await Promise.all([
    getCompBySlug(slug),
    getSiteConfig(),
  ]);

  const name = comp?.name ?? "TFTLab";
  const tier: Tier = comp?.tier ?? "S";
  const tierColor = TIER_COLOR[tier];
  const patch =
    comp?.patchUpdated?.version ??
    comp?.patchIntroduced?.version ??
    config?.currentPatch?.version ??
    null;
  const setToken = comp?.set ?? config?.currentSet ?? null;
  const setNumber = setToken?.match(/(\d+)/)?.[1] ?? null;
  const carries = comp
    ? comp.units
        .filter((unit) => unit.isCarry)
        .map((unit) => unit.champion.name)
        .slice(0, 2)
    : [];

  const footerLeft = setNumber
    ? `Teamfight Tactics · Set ${setNumber}`
    : "Teamfight Tactics";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#030711",
          padding: "64px",
          color: "#E1E7EF",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top bar: wordmark + patch */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#5EEAD4" }}>
            TFTLab
          </div>
          {patch ? (
            <div style={{ display: "flex", fontSize: 28, color: "#94A3B8" }}>
              Patch {patch}
            </div>
          ) : null}
        </div>

        {/* Middle: tier badge + comp name */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 168,
              height: 168,
              borderRadius: 28,
              marginRight: 40,
              backgroundColor: tierColor,
              color: "#030711",
              fontSize: 104,
              fontWeight: 800,
            }}
          >
            {tier}
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 800 }}>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                color: tierColor,
                marginBottom: 8,
              }}
            >
              {TIER_LABEL[tier]}
            </div>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 800, lineHeight: 1.05 }}>
              {name}
            </div>
          </div>
        </div>

        {/* Footer: game/set + carries */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 26,
            color: "#94A3B8",
          }}
        >
          <div style={{ display: "flex" }}>{footerLeft}</div>
          {carries.length ? (
            <div style={{ display: "flex" }}>Carries: {carries.join(", ")}</div>
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  );
}
