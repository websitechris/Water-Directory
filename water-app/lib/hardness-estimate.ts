/**
 * Geology-based drinking-water hardness estimates when lab CaCO₃ data is missing.
 * Midpoints: Soft ~50, Moderate ~150, Hard ~250, Very Hard ~350 mg/L CaCO₃.
 */

export type HardnessEstimateCategory = "soft" | "moderate" | "hard" | "veryhard";

const MIDPOINTS: Record<HardnessEstimateCategory, number> = {
  soft: 50,
  moderate: 150,
  hard: 250,
  veryhard: 350,
};

/** Normalise for set lookup: lower case, collapse spaces, strip trailing "county". */
function normalizeRegion(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s+county$/i, "");
}

const VERY_HARD = new Set(
  [
    "kent",
    "surrey",
    "east sussex",
    "west sussex",
    "hampshire",
    "berkshire",
    "buckinghamshire",
    "hertfordshire",
    "essex",
    "suffolk",
    "norfolk",
    "cambridgeshire",
    "bedfordshire",
    "oxfordshire",
    "greater london",
    "lincolnshire",
    "north yorkshire",
    "east riding of yorkshire",
  ].map(normalizeRegion)
);

const HARD = new Set(
  [
    "somerset",
    "dorset",
    "wiltshire",
    "gloucestershire",
    "northamptonshire",
    "leicestershire",
    "warwickshire",
    "nottinghamshire",
    "derbyshire",
    "rutland",
    "city of bristol",
    "bristol, city of",
  ].map(normalizeRegion)
);

const MODERATE = new Set(
  [
    "staffordshire",
    "shropshire",
    "herefordshire",
    "west yorkshire",
    "south yorkshire",
  ].map(normalizeRegion)
);

const SOFT = new Set(
  [
    "cornwall",
    "devon",
    "lancashire",
    "cumbria",
    "greater manchester",
    "merseyside",
    "northumberland",
    "county durham",
    "durham",
    "tyne and wear",
  ].map(normalizeRegion)
);

/** Match council names that embed a county phrase, e.g. "Somerset West and Taunton". */
function fuzzyMultiWord(normalized: string): HardnessEstimateCategory | null {
  for (const k of VERY_HARD) {
    if (k.includes(" ") && normalized.includes(k)) return "veryhard";
  }
  for (const k of HARD) {
    if (k.includes(" ") && normalized.includes(k)) return "hard";
  }
  for (const k of MODERATE) {
    if (k.includes(" ") && normalized.includes(k)) return "moderate";
  }
  for (const k of SOFT) {
    if (k.includes(" ") && normalized.includes(k)) return "soft";
  }
  return null;
}

function classifyString(normalized: string): HardnessEstimateCategory | null {
  if (!normalized) return null;

  if (
    normalized.includes("west yorkshire") ||
    normalized.includes("south yorkshire")
  ) {
    return "moderate";
  }
  if (
    normalized.includes("north yorkshire") ||
    normalized.includes("east riding of yorkshire")
  ) {
    return "veryhard";
  }

  if (VERY_HARD.has(normalized)) return "veryhard";
  if (HARD.has(normalized)) return "hard";
  if (MODERATE.has(normalized)) return "moderate";
  if (SOFT.has(normalized)) return "soft";

  return fuzzyMultiWord(normalized);
}

export type HardnessEstimateResult = {
  category: HardnessEstimateCategory;
  mgPerLitre: number;
  isEstimate: true;
};

export type HardnessGeoContext = {
  /** postcodes.io `admin_county` */
  adminCounty?: string | null;
  /** postcodes.io `admin_district` (fallback when county is null) */
  adminDistrict?: string | null;
  /** postcodes.io `country` — Wales / Scotland → soft */
  country?: string | null;
  /** postcodes.io `region` — e.g. London */
  region?: string | null;
};

/**
 * Map a ceremonial / historic county (or district) name to a hardness band.
 * Returns null if the area is not in our reference list (e.g. some unitaries).
 */
export function getEstimatedHardness(county: string | null | undefined): HardnessEstimateResult | null {
  const n = normalizeRegion(county ?? "");
  const cat = classifyString(n);
  if (!cat) return null;
  return { category: cat, mgPerLitre: MIDPOINTS[cat], isEstimate: true };
}

/**
 * Use postcodes.io fields: Wales and Scotland → soft; London region → very hard;
 * then try admin_county, then admin_district.
 */
export function getEstimatedHardnessFromGeo(
  ctx: HardnessGeoContext
): HardnessEstimateResult | null {
  const c = (ctx.country ?? "").trim().toLowerCase();
  if (c === "wales" || c === "scotland") {
    return { category: "soft", mgPerLitre: MIDPOINTS.soft, isEstimate: true };
  }

  const region = (ctx.region ?? "").trim().toLowerCase();
  if (region === "london" || region.includes("london")) {
    return { category: "veryhard", mgPerLitre: MIDPOINTS.veryhard, isEstimate: true };
  }

  const fromCounty = getEstimatedHardness(ctx.adminCounty);
  if (fromCounty) return fromCounty;

  const fromDistrict = getEstimatedHardness(ctx.adminDistrict);
  if (fromDistrict) return fromDistrict;

  return null;
}

/** Human label for estimate line (matches scorecard tone). */
export function hardnessEstimateCategoryLabel(cat: HardnessEstimateCategory): string {
  const labels: Record<HardnessEstimateCategory, string> = {
    soft: "Soft",
    moderate: "Moderate",
    hard: "Hard",
    veryhard: "Very Hard",
  };
  return labels[cat];
}

/** Factual disclaimer under the estimate (chalk only where appropriate). */
export function getHardnessEstimateExplanation(
  county: string,
  category: HardnessEstimateCategory
): string {
  const place = county.trim() || "this area";
  if (category === "veryhard") {
    return `Based on the chalk geology in ${place}. Lab-tested data for this specific supply zone is not yet available.`;
  }
  if (category === "hard") {
    return `Based on typical regional geology in ${place} (often limestone or similar). Lab-tested data for this specific supply zone is not yet available.`;
  }
  return `Based on typical regional geology in ${place}. Lab-tested data for this specific supply zone is not yet available.`;
}

/** Display name for the area (prefer ceremonial county, else district). */
export function displayRegionName(ctx: HardnessGeoContext): string {
  const a = (ctx.adminCounty ?? "").trim();
  const b = (ctx.adminDistrict ?? "").trim();
  return a || b || "your area";
}
