import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { getTownsLive } from "@/lib/towns";
import { getTestingLocalitiesLive } from "@/lib/water-testing-localities";

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
      url: `${base}/water-testing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    // NOTE: /water-quality-for-babies, /hard-water-skin-health and
    // /water-quality-home-buying were "Coming soon" stubs duplicating the
    // /blog/ articles below. Removed from the sitemap and 301'd in
    // next.config.ts — they were burning crawl budget at priority 0.8.
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

  // Town water-quality pages carry ~82% of impressions — prioritise them above
  // everything else so crawl budget goes where the demand actually is.
  const liveTowns = getTownsLive();
  const townPaths: MetadataRoute.Sitemap = liveTowns.flatMap((town) => [
    {
      url: `${base}/water-quality/${town.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${base}/sewage-spills/${town.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
  ]);

  // Commercial-intent pages — a distinct query cluster from the data pages.
  const testingPaths: MetadataRoute.Sitemap = getTestingLocalitiesLive().map(
    (l) => ({
      url: `${base}/water-testing/${l.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })
  );

  return [...staticPaths, ...blogPaths, ...townPaths, ...testingPaths];
}
