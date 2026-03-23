import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Town } from "@/lib/towns";

export type TownWaterChemicals = {
  nitrates: number | string | null;
  lead: number | string | null;
  chlorine: number | string | null;
  fluoride: number | string | null;
  hardness: number | null;
};

export type TownWaterResult =
  | {
      ok: true;
      supplier: string;
      zoneName: string | null;
      adminDistrict: string | null;
      hasLocalSamples: boolean;
      chemicals: TownWaterChemicals;
      lsoa: string | null;
    }
  | { ok: false; message: string };

function formatPostcodeForApi(raw: string): string {
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "");
  if (s.length <= 4) return s;
  return s.slice(0, -3) + " " + s.slice(-3);
}

function createWaterDirectoryClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: {
      headers: {
        "Accept-Profile": "water_directory",
        "Content-Profile": "water_directory",
      },
    },
  });
}

/** RPCs follow the same pattern as route.ts (typically public / not schema-prefixed). */
function createDefaultSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

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

type ChemRow = { chemical?: string; parameter?: string; value_raw?: string };

function foldChemicalRows(
  chemData: ChemRow[],
  chemicals: TownWaterChemicals
): void {
  chemData.forEach((row) => {
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
      if (!chemicals.chlorine || chem.includes("(TOTAL)")) chemicals.chlorine = val;
    } else if (chem.includes("FLUORIDE")) chemicals.fluoride = val;
    else if (chem.includes("HARDNESS") && chem.includes("CACO3")) {
      const n =
        typeof val === "number"
          ? val
          : typeof val === "string"
            ? parseFloat(val.replace(/</g, ""))
            : null;
      chemicals.hardness = n != null && !isNaN(n) ? n : null;
    }
  });
}

function emptyChemicals(): TownWaterChemicals {
  return {
    nitrates: null,
    lead: null,
    chlorine: null,
    fluoride: null,
    hardness: null,
  };
}

function hasAnyChemical(c: TownWaterChemicals): boolean {
  return (
    c.nitrates != null ||
    c.lead != null ||
    c.chlorine != null ||
    c.fluoride != null ||
    c.hardness != null
  );
}

const SCOTTISH_PREFIXES = [
  "EH",
  "G",
  "KY",
  "DD",
  "PH",
  "AB",
  "IV",
  "KW",
  "HS",
  "ZE",
  "PA",
  "KA",
  "ML",
  "FK",
  "DG",
  "TD",
];

/**
 * Postcodes.io → LSOA → water_zones + chemical_readings (water_directory schema),
 * then same RPC fallbacks as app/api/water/route.ts (without sewage).
 */
export async function getTownWaterData(town: Town): Promise<TownWaterResult> {
  const supabase = createWaterDirectoryClient();
  const supabaseRpc = createDefaultSupabaseClient();
  if (!supabase || !supabaseRpc) {
    return { ok: false, message: "Water data is temporarily unavailable." };
  }

  const rawPostcode = town.postcode;
  const apiPcd = formatPostcodeForApi(rawPostcode);
  const lookupPcd = rawPostcode.replace(/\s+/g, "").toUpperCase();
  const cleanPostcode = lookupPcd;

  if (SCOTTISH_PREFIXES.some((p) => cleanPostcode.startsWith(p))) {
    return {
      ok: false,
      message: `Scottish Water supply areas are not covered in this dataset yet for ${town.name}.`,
    };
  }

  if (cleanPostcode.startsWith("BT")) {
    return {
      ok: false,
      message: `Northern Ireland water quality pages use a different lookup. Try the homepage postcode search for ${town.postcode}.`,
    };
  }

  let lsoa: string | null = null;
  let adminDistrict: string | null = null;

  try {
    const geoRes = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(apiPcd)}`,
      { next: { revalidate: 86400 } }
    );
    const geoJson = (await geoRes.json()) as {
      result?: {
        codes?: { lsoa?: string; lsoa21?: string };
        admin_district?: string;
      };
    };
    if (geoJson?.result) {
      const codes = geoJson.result.codes;
      lsoa = codes?.lsoa ?? codes?.lsoa21 ?? null;
      adminDistrict = geoJson.result.admin_district ?? null;
    }
  } catch (e) {
    console.warn("town-water postcodes.io failed:", e);
  }

  const chemicals = emptyChemicals();
  let hasLocalSamples = false;
  let supplier = "Your Area";
  let zoneName: string | null = null;

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

    const zoneData = zoneRes.data as
      | { supplier?: string; zone_name?: string | null }
      | null;
    const chemData = (chemRes.data ?? []) as ChemRow[];

    if (zoneData || chemData.length > 0) {
      hasLocalSamples = true;
      supplier = zoneData?.supplier ?? "Your Area";
      zoneName = zoneData?.zone_name ?? null;
      if (chemData.length > 0) foldChemicalRows(chemData, chemicals);
    }
  }

  if (!hasLocalSamples) {
    const { data: lsoaData } = await supabaseRpc.rpc("lookup_lsoa_from_postcode", {
      input_postcode: lookupPcd,
    });
    const lsoa21cd =
      (lsoaData as { lsoa_code?: string }[] | null)?.[0]?.lsoa_code ?? lsoa;

    if (lsoa21cd) {
      const { data: rpcChem } = await supabaseRpc.rpc("get_chemical_averages_for_lsoa", {
        p_lsoa_code: lsoa21cd,
        p_water_company: null,
      });
      if (rpcChem?.length) {
        hasLocalSamples = true;
        (rpcChem as { determinand?: string; avg_result?: number }[]).forEach((row) => {
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
      const { data: regionalData } = await supabaseRpc.rpc("get_regional_chemical_averages", {
        p_water_company: null,
      });
      if (regionalData?.length) {
        (regionalData as { determinand?: string; avg_result?: number }[]).forEach((row) => {
          const d = String(row?.determinand ?? "").trim().toUpperCase();
          const val = row?.avg_result;
          if (val == null && val !== 0) return;
          if ((d === "NITRATE" || d === "NITRATES") && chemicals.nitrates == null)
            chemicals.nitrates = val;
          else if (d === "LEAD" && chemicals.lead == null) chemicals.lead = val;
          else if ((d === "CHLORINE" || d === "CHLORIDE") && chemicals.chlorine == null)
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
    // Match route.ts: any postcode→RPC/regional path uses generic supplier label
    supplier = "Your Area";
  }

  if (!hasAnyChemical(chemicals)) {
    return {
      ok: false,
      message: `Data is not yet available for ${town.name} in our directory. Try searching your exact postcode from the homepage — coverage is expanding.`,
    };
  }

  return {
    ok: true,
    supplier,
    zoneName,
    adminDistrict,
    hasLocalSamples,
    chemicals,
    lsoa,
  };
}
