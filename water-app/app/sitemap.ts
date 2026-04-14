import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { getTownsLive } from "@/lib/towns";

function baseUrl(): string {
  return getSiteUrl();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = new Date();

  const staticPaths: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/sewage-spills`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/water-quality`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/suppliers`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/water-quality-for-babies`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/hard-water-skin-health`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/water-quality-home-buying`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const blogPaths: MetadataRoute.Sitemap = [
    "/blog/hard-water-eczema-uk",
    "/blog/tap-water-nitrates-baby-uk",
    "/blog/water-quality-home-buying",
    "/blog/sewage-spills-near-me-uk",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const liveTowns = getTownsLive();
  const townPaths: MetadataRoute.Sitemap = liveTowns.flatMap((town) => [
    {
      url: `${base}/sewage-spills/${town.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${base}/water-quality/${town.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ]);

  return [...staticPaths, ...blogPaths, ...townPaths];
}
