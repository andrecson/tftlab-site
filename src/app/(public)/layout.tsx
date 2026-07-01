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
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
