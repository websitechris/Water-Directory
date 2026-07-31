import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Next's internal /path+/ → /path+ redirect so middleware can run instead.
  skipTrailingSlashRedirect: true,
  // Keep middleware redirect Location absolute (default rewrites same-host redirects to relative).
  skipProxyUrlNormalize: true,

  async redirects() {
    return [
      // Three root-level "Coming soon" stubs duplicated the real /blog/
      // articles. Consolidating the signal onto the pages with actual content.
      {
        source: "/water-quality-home-buying",
        destination: "/blog/water-quality-home-buying",
        permanent: true,
      },
      {
        source: "/hard-water-skin-health",
        destination: "/blog/hard-water-eczema-uk",
        permanent: true,
      },
      {
        source: "/water-quality-for-babies",
        destination: "/blog/tap-water-nitrates-baby-uk",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
