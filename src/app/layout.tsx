import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MetaComps",
  description: "Tier lists de composições de TFT.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
