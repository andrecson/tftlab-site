import type { Metadata } from "next";
import "./globals.css";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { ErrorMonitor } from "@/components/error-monitor";
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

/**
 * Root metadata (US-023). `metadataBase` makes every relative canonical/OG URL
 * (set here and per-page via `generateMetadata`) resolve to an absolute URL. The
 * title `template` appends the brand to page titles (e.g. "N.O.V.A. Blitzcrank —
 * S Tier · MetaComps"); pages that don't set their own metadata inherit these
 * defaults and the site-wide Open Graph / Twitter cards.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Tier list de comps de TFT`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: SITE_URL,
    title: `${SITE_NAME} — Tier list de comps de TFT`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Tier list de comps de TFT`,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <AnalyticsProvider />
        <ErrorMonitor />
      </body>
    </html>
  );
}
