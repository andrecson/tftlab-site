import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/server/queries/config";

/**
 * Layout for the public route group (US-013).
 *
 * Wraps every public page (tier list, comp detail, builder) with the shared
 * header + footer. Reads the singleton SiteConfig so the header can show the
 * current patch and last-updated date. The root layout still owns <html>/<body>.
 */
export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSiteConfig();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        patchVersion={config?.currentPatch?.version ?? null}
        updatedAt={config?.updatedAt ?? null}
      />
      {/* overflow-x-clip: catalog icons use an absolutely-positioned CSS
          tooltip (IconTooltip) centered over the icon; near the right edge that
          (invisible) tooltip would poke past the viewport and add phantom
          horizontal scroll (US-042). `clip` on the X axis contains it WITHOUT
          forcing a scroll container (so the sticky header + upward tooltips
          still work), keeping every public page free of horizontal scroll. */}
      <main className="flex-1 overflow-x-clip">{children}</main>
      <SiteFooter />
    </div>
  );
}
