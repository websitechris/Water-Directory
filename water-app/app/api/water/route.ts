import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { WaterApiResponse, SpillSite } from "@/types/water";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

function formatPostcodeForApi(raw: string): string {
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "");
  if (s.length <= 4) return s;
  return s.slice(0, -3) + " " + s.slice(-3);
}

async function getSewageSpills(lat: number, lng: number) {
  const url = new URL(
    "https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/edm_data_full_names/FeatureServer/0/query"
  );
  url.searchParams.set("geometry", JSON.stringify({ x: lng, y: lat }));
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("distance", "2000");
  url.searchParams.set("units", "esriSRUnit_Meter");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set(
    "outFields",
    "Site_Name_EA_Consents_Database_,Counted_spills_using_12_24h_cou,Total_Duration__hrs__all_spills,year,Water_Company_Name"
  );
  url.searchParams.set("orderByFields", "year DESC");
  url.searchParams.set("resultRecordCount", "100");
  url.searchParams.set("f", "json");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    const data = await res.json();
    if (!data.features?.length) return [];

    // Group all years per site
    const sitesByName = new Map<string, Record<string, unknown>[]>();
    for (const f of data.features) {
      const a = f.attributes as Record<string, unknown>;
      const name = (a.Site_Name_EA_Consents_Database_ ?? "Unknown site") as string;
      const key = name.trim().toUpperCase();
      if (!sitesByName.has(key)) sitesByName.set(key, []);
      sitesByName.get(key)!.push(a);
    }

    const results: SpillSite[] = [];
    for (const [name, years] of sitesByName) {
      // Prefer most recent year with spills > 0; fall back to most recent year
      const withSpills = years
        .filter((a) => ((a.Counted_spills_using_12_24h_cou as number) ?? 0) > 0)
        .sort((a, b) => String(b.year ?? "").localeCompare(String(a.year ?? "")));
      const best =
        withSpills[0] ??
        years.sort((a, b) => String(b.year ?? "").localeCompare(String(a.year ?? "")))[0];
      if (!best || ((best.Counted_spills_using_12_24h_cou as number) ?? 0) === 0) continue;
      results.push({
        name,
        spills: (best.Counted_spills_using_12_24h_cou as number) ?? 0,
        hours: Math.round((best.Total_Duration__hrs__all_spills as number) ?? 0),
        year: String(best.year ?? "").replace(/- | -/g, "").trim(),
        company: (best.Water_Company_Name as string) ?? "",
      });
    }

    return results.sort((a, b) => b.spills - a.spills).slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchMetaOnly(
  rawPostcode: string
): Promise<NextResponse<{ adminDistrict: string | null; supplier: string } | { error: string }>> {
  const apiPcd = formatPostcodeForApi(rawPostcode);
  const cleanPostcode = rawPostcode.replace(/\s+/g, "").toUpperCase();

  let adminDistrict: string | null = null;

  // Scottish postcodes: no postcodes.io, just return supplier
  const SCOTTISH_PREFIXES = [
    "EH", "G", "KY", "DD", "PH", "AB", "IV", "KW", "HS", "ZE",
    "PA", "KA", "ML", "FK", "DG", "TD",
  ];
  if (SCOTTISH_PREFIXES.some((p) => cleanPostcode.startsWith(p))) {
    return NextResponse.json({
      adminDistrict: null,
      supplier: "Scottish Water",
    });
  }

  // NI postcodes
  if (cleanPostcode.startsWith("BT")) {
    try {
      const geoRes = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(apiPcd)}`
      );
      const geoJson = await geoRes.json();
      if (geoJson?.result?.admin_district) {
        adminDistrict = geoJson.result.admin_district;
      }
    } catch {
      /* ignore */
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({
        adminDistrict,
        supplier: "Northern Ireland Water",
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: niZone } = await supabase
      .from("ni_postcode_zones")
      .select("zone_id")
      .eq("postcode", cleanPostcode)
      .maybeSingle();
    if (niZone?.zone_id) {
      const { data: zoneData } = await supabase
        .from("water_zones")
        .select("supplier")
        .eq("zone_id", niZone.zone_id)
        .maybeSingle();
      return NextResponse.json({
        adminDistrict,
        supplier: zoneData?.supplier ?? "Northern Ireland Water",
      });
    }
    return NextResponse.json({
      adminDistrict,
      supplier: "Northern Ireland Water",
    });
  }

  // England/Wales: postcodes.io + water_zones (supplier only)
  try {
    const geoRes = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(apiPcd)}`
    );
    const geoJson = await geoRes.json();
    if (geoJson?.result) {
      adminDistrict = geoJson.result.admin_district ?? null;
      const lsoa = geoJson.result.codes?.lsoa ?? geoJson.result.codes?.lsoa21 ?? null;
      if (lsoa && SUPABASE_URL && SUPABASE_ANON_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: zoneData } = await supabase
          .from("water_zones")
          .select("supplier")
          .eq("zone_id", lsoa)
          .maybeSingle();
        return NextResponse.json({
          adminDistrict,
          supplier: zoneData?.supplier ?? "Your Area",
        });
      }
      return NextResponse.json({
        adminDistrict,
        supplier: "Your Area",
      });
    }
  } catch {
    /* fall through */
  }
  return NextResponse.json({
    adminDistrict,
    supplier: "Your Area",
  });
}

export async function GET(request: NextRequest) {
  const postcode = request.nextUrl.searchParams.get("postcode")?.trim();
  const metaOnly = request.nextUrl.searchParams.get("metaOnly") === "true";
  if (!postcode) {
    return NextResponse.json(
      { error: "Missing postcode parameter" },
      { status: 400 }
    );
  }
  if (metaOnly) {
    return fetchMetaOnly(postcode);
  }
  return fetchWaterData(postcode);
}

export async function POST(request: NextRequest) {
  let body: { postcode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const postcode = body.postcode?.trim();
  if (!postcode) {
    return NextResponse.json(
      { error: "Missing postcode in body" },
      { status: 400 }
    );
  }
  return fetchWaterData(postcode);
}

async function fetchWaterData(
  rawPostcode: string
): Promise<NextResponse<WaterApiResponse | { error: string }>> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      {
        supplier: "Your Area",
        zoneName: null,
        hasLocalSamples: false,
        chemicals: { nitrates: null, lead: null, chlorine: null, fluoride: null, hardness: null },
        sewageSpills: [],
        source: "Water quality data",
        error: "Server misconfiguration: missing Supabase credentials",
      },
      { status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const apiPcd = formatPostcodeForApi(rawPostcode);
  const lookupPcd = rawPostcode.replace(/\s+/g, "").toUpperCase();
  const cleanPostcode = lookupPcd;

  let lsoa: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;

  let adminDistrict: string | null = null;

  // 0. NI postcode: lookup via ni_postcode_zones
  if (cleanPostcode.startsWith("BT")) {
    // Optional: get town from postcodes.io for NI (returns admin_district e.g. "Belfast")
    try {
      const geoRes = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(apiPcd)}`
      );
      const geoJson = await geoRes.json();
      if (geoJson?.result?.admin_district) {
        adminDistrict = geoJson.result.admin_district;
      }
    } catch {
      /* ignore */
    }

    const { data: niZone } = await supabase
      .from("ni_postcode_zones")
      .select("zone_id")
      .eq("postcode", cleanPostcode)
      .maybeSingle();

    if (niZone?.zone_id) {
      const zoneRes = await supabase
        .from("water_zones")
        .select("*")
        .eq("zone_id", niZone.zone_id)
        .maybeSingle();
      const chemRes = await supabase
        .from("chemical_readings")
        .select("*")
        .eq("zone_id", niZone.zone_id);

      const zoneData = zoneRes.data;
      const chemData = chemRes.data;

      if (zoneData || (chemData && chemData.length > 0)) {
        const chemicals = {
          nitrates: null as number | string | null,
          lead: null as number | string | null,
          chlorine: null as number | string | null,
          fluoride: null as number | string | null,
          hardness: null as number | null,
        };
        function parseValue(val: string | number | null | undefined): number | string | null {
          if (val == null || (typeof val === "number" && isNaN(val))) return null;
          if (typeof val === "string" && val.includes("|")) {
            const parts = val.split("|");
            const mean = parts[1]?.trim();
            return mean ? parseFloat(mean) || mean : null;
          }
          const n = Number(val);
          return isNaN(n) ? String(val) : n;
        }
        if (chemData && chemData.length > 0) {
          chemData.forEach((row: { chemical?: string; parameter?: string; value_raw?: string }) => {
            let displayVal = row.value_raw;
            if (displayVal && displayVal.includes("|")) {
              displayVal = displayVal.split("|")[1]?.trim() ?? displayVal;
            }
            const chem = (row.chemical ?? row.parameter ?? "").toUpperCase();
            const val = parseValue(displayVal);
            if (chem.includes("LEAD")) chemicals.lead = val;
            else if (
              (chem.includes("NITRATE") || chem.includes("NITRATES") || chem.includes("NO3")) &&
              !chem.includes("NITRITE") &&
              !chem.includes("NO2")
            )
              chemicals.nitrates = val;
            else if (chem.includes("CHLORINE") || chem.includes("DISINFECTANT")) {
              if (!chemicals.chlorine || chem.includes("(TOTAL)"))
                chemicals.chlorine = val;
            }             else if (chem.includes("FLUORIDE")) chemicals.fluoride = val;
            else if (chem.includes("HARDNESS") && chem.includes("CACO3")) {
              const n = typeof val === "number" ? val : (typeof val === "string" ? parseFloat(val.replace(/</g, "")) : null);
              chemicals.hardness = n != null && !isNaN(n) ? n : null;
            }
          });
        }
        return NextResponse.json({
          supplier: zoneData?.supplier ?? "Northern Ireland Water",
          zoneName: zoneData?.zone_name ?? null,
          adminDistrict,
          hasLocalSamples: true,
          chemicals,
          sewageSpills: [],
          source: `${zoneData?.supplier ?? "Northern Ireland Water"} 2024 Lab Results`,
        });
      }
    }
  }

  // Scottish postcodes: return coming soon (skip postcodes.io)
  const SCOTTISH_PREFIXES = [
    "EH", "G", "KY", "DD", "PH", "AB", "IV", "KW", "HS", "ZE",
    "PA", "KA", "ML", "FK", "DG", "TD",
  ];
  if (SCOTTISH_PREFIXES.some((p) => cleanPostcode.startsWith(p))) {
    return NextResponse.json({
      supplier: "Scottish Water",
      zoneName: null,
      hasLocalSamples: false,
      chemicals: { nitrates: null, lead: null, chlorine: null, fluoride: null, hardness: null },
      sewageSpills: [],
      source: "Scottish Water",
      comingSoon: true,
    });
  }

  // 1. Postcodes.io: Get LSOA + GPS
  try {
    const geoRes = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(apiPcd)}`
    );
    const geoJson = await geoRes.json();
    if (geoJson?.result) {
      const codes = geoJson.result.codes;
      lsoa = codes?.lsoa ?? codes?.lsoa21 ?? null;
      lat = geoJson.result.latitude;
      lng = geoJson.result.longitude;
      adminDistrict = geoJson.result.admin_district ?? null;
    }
  } catch (e) {
    console.warn("Postcodes.io failed:", e);
  }

  let hasLocalSamples = false;
  let supplier = "Your Area";
  let zoneName: string | null = null;
  let source = "Regional baseline data";
  const chemicals = {
    nitrates: null as number | string | null,
    lead: null as number | string | null,
    chlorine: null as number | string | null,
    fluoride: null as number | string | null,
    hardness: null as number | null,
  };

  function parseValue(val: string | number | null | undefined): number | string | null {
    if (val == null || (typeof val === "number" && isNaN(val))) return null;
    if (typeof val === "string" && val.includes("|")) {
      const parts = val.split("|");
      const mean = parts[1]?.trim();
      return mean ? parseFloat(mean) || mean : null;
    }
    const n = Number(val);
    return isNaN(n) ? String(val) : n;
  }

  // 2. Query water_zones + chemical_readings by zone_id (LSOA)
  if (lsoa) {
    const zoneRes = await supabase
      .from("water_zones")
      .select("*")
      .eq("zone_id", lsoa)
      .maybeSingle();
    const chemRes = await supabase
      .from("chemical_readings")
      .select("*")
      .eq("zone_id", lsoa);

    const zoneData = zoneRes.data;
    const chemData = chemRes.data;

    if (zoneData || (chemData && chemData.length > 0)) {
      hasLocalSamples = true;
      supplier = zoneData?.supplier ?? "Your Area";
      zoneName = zoneData?.zone_name ?? null;
      source = `${zoneData?.supplier ?? "Water Supplier"} 2024 Lab Results`;

      if (chemData && chemData.length > 0) {
        // Map DB chemical names to scorecard slots (handles Anglian, Cambridge, Thames, NI variants)
        // DB names: Nitrate, Nitrate as NO3, NO3 | Lead as Pb, Lead | Chlorine (Residual), Chlorine (Total) | Fluoride
        chemData.forEach((row: { chemical?: string; value_raw?: string }) => {
          let displayVal = row.value_raw;
          if (displayVal && displayVal.includes("|")) {
            displayVal = displayVal.split("|")[1]?.trim() ?? displayVal;
          }
          const chem = (row.chemical || "").toUpperCase();
          const val = parseValue(displayVal);
          if (chem.includes("LEAD")) chemicals.lead = val;
          else if (
            (chem.includes("NITRATE") || chem.includes("NITRATES") || chem.includes("NO3")) &&
            !chem.includes("NITRITE") &&
            !chem.includes("NO2")
          )
            chemicals.nitrates = val;
          else if (chem.includes("CHLORINE") || chem.includes("DISINFECTANT")) {
            // Prefer Chlorine (Total) over Chlorine (Residual) when both exist
            if (!chemicals.chlorine || chem.includes("(TOTAL)"))
              chemicals.chlorine = val;
          } else if (chem.includes("FLUORIDE")) chemicals.fluoride = val;
          else if (chem.includes("HARDNESS") && chem.includes("CACO3")) {
            const n = typeof val === "number" ? val : (typeof val === "string" ? parseFloat(val.replace(/</g, "")) : null);
            chemicals.hardness = n != null && !isNaN(n) ? n : null;
          }
        });
      }
    }
  }

  // 3. Fallback: RPC lookup + regional
  if (!hasLocalSamples) {
    const { data: lsoaData } = await supabase.rpc("lookup_lsoa_from_postcode", {
      input_postcode: lookupPcd,
    });
    const lsoa21cd = lsoaData?.[0]?.lsoa_code ?? lsoa;

    if (lsoa21cd) {
      const { data: rpcChem } = await supabase.rpc(
        "get_chemical_averages_for_lsoa",
        { p_lsoa_code: lsoa21cd, p_water_company: null }
      );
      if (rpcChem?.length) {
        hasLocalSamples = true;
        rpcChem.forEach((row: { determinand?: string; avg_result?: number }) => {
          const d = String(row?.determinand ?? "").trim().toUpperCase();
          const val = row?.avg_result;
          if (val == null && val !== 0) return;
          if (d === "NITRATE" || d === "NITRATES")
            chemicals.nitrates = chemicals.nitrates ?? val;
          else if (d === "LEAD") chemicals.lead = chemicals.lead ?? val;
          else if (d === "CHLORINE" || d === "CHLORIDE")
            chemicals.chlorine = chemicals.chlorine ?? val;
          else if (d === "FLUORIDE") chemicals.fluoride = chemicals.fluoride ?? val;
          else if ((d === "HARDNESS" || d === "CACO3") && chemicals.hardness == null)
            chemicals.hardness = typeof val === "number" ? val : null;
        });
      }
    }
    if (!hasLocalSamples || (chemicals.nitrates == null && chemicals.lead == null)) {
      const { data: regionalData } = await supabase.rpc(
        "get_regional_chemical_averages",
        { p_water_company: null }
      );
      if (regionalData?.length) {
        regionalData.forEach((row: { determinand?: string; avg_result?: number }) => {
          const d = String(row?.determinand ?? "").trim().toUpperCase();
          const val = row?.avg_result;
          if (val == null && val !== 0) return;
          if ((d === "NITRATE" || d === "NITRATES") && chemicals.nitrates == null)
            chemicals.nitrates = val;
          else if (d === "LEAD" && chemicals.lead == null) chemicals.lead = val;
          else if (
            (d === "CHLORINE" || d === "CHLORIDE") &&
            chemicals.chlorine == null
          )
            chemicals.chlorine = val;
          else if (d === "FLUORIDE" && chemicals.fluoride == null)
            chemicals.fluoride = val;
          else if (
            (d === "HARDNESS" || d === "CACO3") &&
            chemicals.hardness == null &&
            typeof val === "number"
          )
            chemicals.hardness = val;
        });
      }
    }
    supplier = "Your Area";
    source = "Regional baseline data";
  }

  // 4. Sewage spill lookup (EA EDM data, England/Wales only)
  const sewageSpills =
    lat != null && lng != null ? await getSewageSpills(lat, lng) : [];

  return NextResponse.json({
    supplier,
    zoneName,
    adminDistrict,
    hasLocalSamples,
    chemicals,
    sewageSpills,
    source,
  });
}
