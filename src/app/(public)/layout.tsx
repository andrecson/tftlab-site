import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppButton } from "@/components/whatsapp-button";

/**
 * Layout for the public route group.
 *
 * Wraps every public page (landing, tier list, comp detail, builder, plans,
 * shop, about) with the unified header + footer + floating WhatsApp button. The
 * root layout still owns <html>/<body>.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      {/* overflow-x-clip: catalog icons use an absolutely-positioned CSS
          tooltip (IconTooltip) centered over the icon; near the right edge that
          (invisible) tooltip would poke past the viewport and add phantom
          horizontal scroll (US-042). `clip` on the X axis contains it WITHOUT
          forcing a scroll container (so the sticky header + upward tooltips
          still work), keeping every public page free of horizontal scroll. */}
      <main className="flex-1 overflow-x-clip">{children}</main>
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}
