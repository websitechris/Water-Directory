import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Next's internal /path+/ → /path+ redirect so middleware can run instead.
  skipTrailingSlashRedirect: true,
  // Keep middleware redirect Location absolute (default rewrites same-host redirects to relative).
  skipProxyUrlNormalize: true,
};

export default nextConfig;
