import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { ErrorMonitor } from "@/components/error-monitor";
import {
  NOINDEX,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

/**
 * Body/UI type: Inter — a fuller, device-consistent sans that reads like the SF
 * Pro / system UI look tftlab.com.br shows on Apple devices (the site itself uses
 * the OS `ui-sans-serif`, which renders thinner on some platforms). Exposed as a
 * CSS variable consumed by Tailwind's `font-sans`.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Root metadata (US-023). `metadataBase` makes every relative canonical/OG URL
 * (set here and per-page via `generateMetadata`) resolve to an absolute URL. The
 * title `template` appends the brand to page titles (e.g. "N.O.V.A. Blitzcrank —
 * S Tier · TFTLab"); pages that don't set their own metadata inherit these
 * defaults and the site-wide Open Graph / Twitter cards.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · Tier list de comps de TFT`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Hidden/test deploy (NEXT_PUBLIC_NOINDEX=true): emit a `noindex` meta on every
  // page so the test never gets indexed alongside the live tftlab.com.br.
  robots: NOINDEX ? { index: false, follow: false } : undefined,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: SITE_URL,
    title: `${SITE_NAME} · Tier list de comps de TFT`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · Tier list de comps de TFT`,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <SessionProvider>{children}</SessionProvider>
        <AnalyticsProvider />
        <ErrorMonitor />
      </body>
    </html>
  );
}
