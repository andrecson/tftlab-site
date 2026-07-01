/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Champion/trait/item/augment icons are served from Community Dragon
    // (see src/server/ddragon.ts). Whitelisting the host lets next/image render
    // them. US-042 tunes the broader image/perf story on top of this.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.communitydragon.org",
      },
    ],
  },
};

export default nextConfig;
