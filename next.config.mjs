/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework in response headers.
  poweredByHeader: false,
  images: {
    // Champion/trait/item/augment icons are served from Community Dragon
    // (see src/server/ddragon.ts). Whitelisting the host lets next/image render
    // them.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.communitydragon.org",
      },
      // Marketing images (hero logo, mentors, etc.) exported from the old
      // Hostinger Horizons site live on its CDN.
      {
        protocol: "https",
        hostname: "horizons-cdn.hostinger.com",
      },
    ],
    // US-042 (perf): serve modern, smaller formats. next/image negotiates AVIF
    // first, then WebP, then the original — this cuts icon bytes on the tier
    // list / comp / builder pages, which helps the mobile Lighthouse score.
    formats: ["image/avif", "image/webp"],
    // Every icon we render is small (14–72 CSS px, i.e. ≤144px @2x). Restricting
    // the generated widths to this set (from the 16/32/48/64/96/128 imageSizes)
    // avoids emitting oversized variants in the srcset for these tiny icons.
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200],
    // The upstream catalog icons are immutable per set, so let the optimizer
    // cache each optimized variant for a long time (31 days).
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
