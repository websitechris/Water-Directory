import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { WaterApiResponse } from "@/types/water";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

function formatPostcodeForApi(raw: string): string {
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "");
  if (s.length <= 4) return s;
  return s.slice(0, -3) + " " + s.slice(-3);
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: NextRequest) {
  const postcode = request.nextUrl.searchParams.get("postcode")?.trim();
  if (!postcode) {
    return NextResponse.json(
      { error: "Missing postcode parameter" },
      { status: 400 }
    );
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
        chemicals: { nitrates: null, lead: null, chlorine: null, fluoride: null },
        nearestSpill: null,
        source: "Southern Water 2024 Lab Results",
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
            } else if (chem.includes("FLUORIDE")) chemicals.fluoride = val;
          });
        }
        return NextResponse.json({
          supplier: zoneData?.supplier ?? "Northern Ireland Water",
          zoneName: zoneData?.zone_name ?? null,
          adminDistrict,
          hasLocalSamples: true,
          chemicals,
          nearestSpill: null,
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
      chemicals: { nitrates: null, lead: null, chlorine: null, fluoride: null },
      nearestSpill: null,
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
  let source = "Southern Water 2024 Lab Results";
  const chemicals = {
    nitrates: null as number | string | null,
    lead: null as number | string | null,
    chlorine: null as number | string | null,
    fluoride: null as number | string | null,
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
        });
      }
    }
    if (!hasLocalSamples || (chemicals.nitrates == null && chemicals.lead == null)) {
      const { data: regionalData } = await supabase.rpc(
        "get_regional_chemical_averages",
        { p_water_company: "Southern Water" }
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
        });
      }
    }
    supplier = hasLocalSamples ? "Southern Water" : "Your Area";
    source = "Southern Water 2024 Lab Results";
  }

  // 4. Sewage spill lookup
  let nearestSpill: {
    siteName: string;
    countedSpills: number;
    totalDurationHrs: number;
  } | null = null;

  if (lat != null && lng != null) {
    const { data: spillsData } = await supabase.rpc("get_sewage_spills_near", {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: 80,
    });
    if (spillsData?.length) {
      let minDist = Infinity;
      let nearest: (typeof spillsData)[0] | null = null;
      spillsData.forEach((s: { latitude: number; longitude: number }) => {
        const d = haversineKm(lat!, lng!, s.latitude, s.longitude);
        if (d < minDist) {
          minDist = d;
          nearest = s;
        }
      });
      if (nearest) {
        nearestSpill = {
          siteName: nearest.site_name ?? "Nearest overflow",
          countedSpills: nearest.counted_spills ?? 0,
          totalDurationHrs: nearest.total_duration_hrs ?? 0,
        };
      }
    }
  }

  return NextResponse.json({
    supplier,
    zoneName,
    adminDistrict,
    hasLocalSamples,
    chemicals,
    nearestSpill,
    source,
  });
}
