/**
 * Environment Agency EDM storm overflow data (ArcGIS Feature Server).
 * Same source as app/api/water/route.ts getSewageSpills — do not use Supabase for sewage.
 */

import type { SpillSite } from "@/types/water";

const ARCGIS_EDM_QUERY =
  "https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/edm_data_full_names/FeatureServer/0/query";

const OUT_FIELDS =
  "Site_Name_EA_Consents_Database_,Counted_spills_using_12_24h_cou,Total_Duration__hrs__all_spills,year,Water_Company_Name";

const PAGE_SIZE = 2000;

function normalizeYear(raw: unknown): string {
  return String(raw ?? "").replace(/- | -/g, "").trim();
}

function yearSortKey(y: string): number {
  const m = y.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : 0;
}

/**
 * Fetch all feature rows within radius (handles ArcGIS pagination).
 */
async function fetchArcgisFeaturePages(
  lat: number,
  lng: number,
  radiusMeters: number,
  revalidateSeconds: number
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let offset = 0;

  for (;;) {
    const url = new URL(ARCGIS_EDM_QUERY);
    url.searchParams.set("geometry", JSON.stringify({ x: lng, y: lat }));
    url.searchParams.set("geometryType", "esriGeometryPoint");
    url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    url.searchParams.set("distance", String(radiusMeters));
    url.searchParams.set("units", "esriSRUnit_Meter");
    url.searchParams.set("inSR", "4326");
    url.searchParams.set("outFields", OUT_FIELDS);
    url.searchParams.set("orderByFields", "year DESC");
    url.searchParams.set("resultRecordCount", String(PAGE_SIZE));
    url.searchParams.set("resultOffset", String(offset));
    url.searchParams.set("f", "json");

    const res = await fetch(url.toString(), {
      next: { revalidate: revalidateSeconds },
    });
    const data = (await res.json()) as {
      features?: { attributes: Record<string, unknown> }[];
      exceededTransferLimit?: boolean;
    };

    const batch = data.features ?? [];
    if (batch.length === 0) break;

    for (const f of batch) {
      all.push(f.attributes);
    }

    if (!data.exceededTransferLimit || batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

/**
 * Group by EA site name, pick most recent year with spills > 0 (same rules as postcode lookup).
 * Returns all sites sorted by spill count descending (no top-N cap).
 */
export function groupAttributesToSites(
  attributesList: Record<string, unknown>[]
): SpillSite[] {
  const sitesByName = new Map<string, Record<string, unknown>[]>();
  for (const a of attributesList) {
    const name = (a.Site_Name_EA_Consents_Database_ ?? "Unknown site") as string;
    const key = name.trim().toUpperCase();
    if (!sitesByName.has(key)) sitesByName.set(key, []);
    sitesByName.get(key)!.push(a);
  }

  const results: SpillSite[] = [];
  for (const [name, years] of sitesByName) {
    const withSpills = years
      .filter((a) => ((a.Counted_spills_using_12_24h_cou as number) ?? 0) > 0)
      .sort(
        (a, b) =>
          yearSortKey(normalizeYear(b.year)) - yearSortKey(normalizeYear(a.year))
      );
    const best =
      withSpills[0] ??
      [...years].sort(
        (a, b) =>
          yearSortKey(normalizeYear(b.year)) - yearSortKey(normalizeYear(a.year))
      )[0];
    if (!best || ((best.Counted_spills_using_12_24h_cou as number) ?? 0) === 0)
      continue;
    results.push({
      name,
      spills: (best.Counted_spills_using_12_24h_cou as number) ?? 0,
      hours: Math.round((best.Total_Duration__hrs__all_spills as number) ?? 0),
      year: normalizeYear(best.year),
      company: (best.Water_Company_Name as string) ?? "",
    });
  }

  return results.sort((a, b) => b.spills - a.spills);
}

export type SewageTownSummary = {
  sites: SpillSite[];
  /** Latest reporting year seen across sites (for hero/footer copy) */
  primaryYear: string;
  totalSpills: number;
  totalHours: number;
  siteCount: number;
};

export async function querySewageSpillsNearPoint(
  lat: number,
  lng: number,
  radiusMeters: number,
  options?: { revalidateSeconds?: number }
): Promise<SewageTownSummary> {
  const revalidateSeconds = options?.revalidateSeconds ?? 86400;
  const attrs = await fetchArcgisFeaturePages(lat, lng, radiusMeters, revalidateSeconds);
  const sites = groupAttributesToSites(attrs);

  let primaryYear = "";
  for (const s of sites) {
    if (yearSortKey(s.year) > yearSortKey(primaryYear)) primaryYear = s.year;
  }
  if (!primaryYear) primaryYear = "latest available";

  const totalSpills = sites.reduce((acc, s) => acc + s.spills, 0);
  const totalHours = sites.reduce((acc, s) => acc + s.hours, 0);

  return {
    sites,
    primaryYear,
    totalSpills,
    totalHours,
    siteCount: sites.length,
  };
}
