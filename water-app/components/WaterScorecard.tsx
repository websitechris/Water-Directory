"use client";

export type WaterScorecardData = {
  nitrates: number | string | null;
  lead: number | string | null;
  chlorine: number | string | null;
  fluoride: number | string | null;
  pfas?: string;
  hasLocalSamples: boolean;
  supplier: string;
  zoneName: string | null;
  propertyValueImpact: "high" | "low";
  familyHealthScore: "good" | "review";
};

function fmt(val: number | string | null | undefined): string {
  if (val == null || (typeof val === "number" && isNaN(val))) return "—";
  if (typeof val === "string" && val.includes("<")) return val;
  const n = Number(val);
  return isNaN(n) ? String(val) : n.toFixed(2);
}

export function WaterScorecard({ data }: { data: WaterScorecardData }) {
  const {
    nitrates,
    lead,
    chlorine,
    fluoride,
    pfas = "N/A",
    hasLocalSamples,
    supplier,
    zoneName,
    propertyValueImpact,
    familyHealthScore,
  } = data;

  const displayName = zoneName
    ? `${supplier} (${zoneName})`
    : supplier;

  const sourceText = hasLocalSamples
    ? `Source: ${supplier} official lab results 2024`
    : "Regional baseline data shown — local lab results for your exact supply zone are updated annually by your water company";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-500">
        Water Supplier
      </div>
      <div className="mb-6 text-xl font-bold text-slate-800">{displayName}</div>

      <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Water Quality Scorecard
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-md border border-slate-100 bg-white p-3 text-center">
            <div className="text-lg font-semibold text-slate-800">
              {fmt(nitrates)}
            </div>
            <div className="text-xs text-slate-500">Nitrates (mg/L)</div>
          </div>
          <div className="rounded-md border border-slate-100 bg-white p-3 text-center">
            <div className="text-lg font-semibold text-slate-800">
              {fmt(chlorine)}
            </div>
            <div className="text-xs text-slate-500">Chlorine (mg/L)</div>
          </div>
          <div className="rounded-md border border-slate-100 bg-white p-3 text-center">
            <div className="text-lg font-semibold text-slate-800">
              {fmt(fluoride)}
            </div>
            <div className="text-xs text-slate-500">Fluoride Added</div>
          </div>
          <div className="rounded-md border border-slate-100 bg-white p-3 text-center">
            <div className="text-lg font-semibold text-slate-800">{pfas}</div>
            <div className="text-xs text-slate-500">PFAS Risk</div>
          </div>
          <div className="rounded-md border border-slate-100 bg-white p-3 text-center">
            <div className="text-lg font-semibold text-slate-800">
              {fmt(lead)}
            </div>
            <div className="text-xs text-slate-500">Lead (µg/L)</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase ${
              propertyValueImpact === "high"
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Property Value: {propertyValueImpact === "high" ? "High" : "Low/Neutral"}
          </span>
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase ${
              familyHealthScore === "review"
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Family Health: {familyHealthScore === "review" ? "Review" : "Good"}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">{sourceText}</p>
      </div>
    </div>
  );
}
