"use client";

import type { HardnessEstimateCategory } from "@/lib/hardness-estimate";
import {
  getHardnessEstimateExplanation,
  hardnessEstimateCategoryLabel,
} from "@/lib/hardness-estimate";

export type WaterScorecardData = {
  nitrates: number | string | null;
  lead: number | string | null;
  chlorine: number | string | null;
  fluoride: number | string | null;
  hardness: number | null;
  /** Set when hardness is a geology-based fallback (not lab CaCO₃). */
  hardnessEstimate?: {
    regionLabel: string;
    category: HardnessEstimateCategory;
  } | null;
  hasLocalSamples: boolean;
  supplier: string;
  zoneName: string | null;
  propertyValueImpact: "high" | "low";
  familyHealthScore: "good" | "review";
  sewageSpills?: { name: string; spills: number; hours: number; year: string; company: string }[];
};

function parseVal(val: number | string | null | undefined): number | null {
  if (val == null || (typeof val === "number" && isNaN(val))) return null;
  if (typeof val === "string") {
    const cleaned = val.replace(/</g, "").trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return typeof val === "number" ? val : null;
}

function fmt(val: number | string | null | undefined): string {
  const n = parseVal(val);
  if (n === null) return "—";
  if (typeof val === "string" && String(val).includes("<")) return val;
  return n.toFixed(2);
}

type GaugeConfig = {
  name: string;
  unit: string;
  limit: number;
  /** 0–1, where amber starts */
  amberStart: number;
  /** 0–1, where red starts */
  redStart: number;
  /** Overrides the default "Limit: X" caption where no UK PCV exists. */
  limitLabel?: string;
  verdicts: { green: string; amber: string; red: string };
};

const GAUGE_CONFIG: Record<string, GaugeConfig> = {
  nitrates: {
    name: "Nitrates",
    unit: "mg/L",
    limit: 50,
    amberStart: 0.5, // 25 mg/L
    redStart: 1,
    verdicts: {
      green: "Well within safe limits",
      amber: "Approaching legal limit — consider filtering for babies",
      red: "Above legal limit",
    },
  },
  chlorine: {
    name: "Chlorine",
    unit: "mg/L",
    // No UK PCV exists for free chlorine — it is controlled for taste and odour
    // and a residual is required through the network to keep water safe in
    // transit. Previously scaled to 0.5 mg/L, which rendered normally-dosed
    // supplies (e.g. Newcastle at 0.63) red and "Above legal limit".
    // Scaled against the WHO guideline value of 5 mg/L instead.
    limit: 5,
    amberStart: 0.6, // 3 mg/L
    redStart: 0.8, // 4 mg/L
    limitLabel: "No UK limit · WHO guideline 5 mg/L",
    verdicts: {
      green: "Normal level",
      amber: "May affect taste and odour",
      red: "Unusually high — worth reporting to your supplier",
    },
  },
  fluoride: {
    name: "Fluoride",
    unit: "mg/L",
    limit: 1.5,
    amberStart: 0.9,
    redStart: 1,
    verdicts: {
      green: "Within safe limits",
      amber: "Approaching legal limit",
      red: "Above legal limit",
    },
  },
  lead: {
    name: "Lead",
    unit: "µg/L",
    limit: 10,
    amberStart: 0.5, // 5 µg/L
    redStart: 1,
    verdicts: {
      green: "Well within safe limits",
      amber: "Approaching limit — check for lead pipes",
      red: "Above legal limit",
    },
  },
};

// Hardness: 0–100 Soft (blue), 101–200 Moderately Hard (green), 201–300 Hard (amber), 300+ Very Hard (red)
const HARDNESS_MAX = 400;

function getHardnessCategory(val: number): "soft" | "moderate" | "hard" | "veryhard" {
  if (val <= 100) return "soft";
  if (val <= 200) return "moderate";
  if (val <= 300) return "hard";
  return "veryhard";
}

function HardnessGaugeBar({ value }: { value: number | null }) {
  const num = value;
  if (num === null) {
    return (
      <div className="mt-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]" />
        <p className="mt-1 text-xs text-[#64748b]">—</p>
      </div>
    );
  }

  const category = getHardnessCategory(num);
  const labels = {
    soft: "Soft",
    moderate: "Moderately Hard",
    hard: "Hard",
    veryhard: "Very Hard",
  };
  const colors = {
    soft: "text-[#2563eb]",
    moderate: "text-[#22c55e]",
    hard: "text-[#d97706]",
    veryhard: "text-[#dc2626]",
  };
  const pct = Math.min((num / HARDNESS_MAX) * 100, 98);

  return (
    <div className="mt-2">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="absolute left-0 top-0 h-full rounded-l-full bg-[#2563eb]"
          style={{ width: "25%" }}
        />
        <div
          className="absolute top-0 h-full bg-[#22c55e]"
          style={{ left: "25%", width: "25%" }}
        />
        <div
          className="absolute top-0 h-full bg-[#d97706]"
          style={{ left: "50%", width: "25%" }}
        />
        <div
          className="absolute right-0 top-0 h-full rounded-r-full bg-[#dc2626]"
          style={{ width: "25%" }}
        />
        <div
          className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0f2942] shadow-sm"
          style={{ left: `${pct}%` }}
        />
      </div>
      <p className={`mt-1 text-xs font-medium ${colors[category]}`}>{labels[category]}</p>
    </div>
  );
}

function GaugeBar({
  value,
  config,
}: {
  value: number | string | null;
  config: GaugeConfig;
}) {
  const num = parseVal(value);
  const ratio = num !== null ? Math.min(num / config.limit, 1.2) : 0;
  const pct = Math.min(ratio * 100, 100);

  return (
    <div className="mt-2">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="absolute left-0 top-0 h-full rounded-l-full bg-[#22c55e]"
          style={{ width: `${config.amberStart * 100}%` }}
        />
        <div
          className="absolute top-0 h-full bg-[#d97706]"
          style={{
            left: `${config.amberStart * 100}%`,
            width: `${(config.redStart - config.amberStart) * 100}%`,
          }}
        />
        <div
          className="absolute right-0 top-0 h-full rounded-r-full bg-[#dc2626]"
          style={{ width: `${(1 - config.redStart) * 100}%` }}
        />
        {num !== null && (
          <div
            className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0f2942] shadow-sm"
            style={{ left: `${Math.min(pct, 98)}%` }}
          />
        )}
      </div>
      <p className="mt-1 text-xs text-[#64748b]">
        {config.limitLabel ?? `Limit: ${config.limit} ${config.unit}`}
      </p>
    </div>
  );
}

export function WaterScorecard({ data }: { data: WaterScorecardData }) {
  const {
    nitrates,
    lead,
    chlorine,
    fluoride,
    hardness,
    hardnessEstimate,
    hasLocalSamples,
    supplier,
  } = data;

  const displaySupplier = supplier.replace(/\(.*$/, "").trim();
  const sourceText = hasLocalSamples
    ? `Source: ${displaySupplier} official lab results`
    : "Regional baseline data — local lab results for your exact supply zone are updated annually by your water company";

  const chemicals = [
    { key: "nitrates" as const, value: nitrates, config: GAUGE_CONFIG.nitrates },
    { key: "chlorine" as const, value: chlorine, config: GAUGE_CONFIG.chlorine },
    { key: "fluoride" as const, value: fluoride, config: GAUGE_CONFIG.fluoride },
    { key: "lead" as const, value: lead, config: GAUGE_CONFIG.lead },
  ];

  const hardnessNum = hardness != null && !isNaN(hardness) ? hardness : null;
  const hardnessIsEstimate = Boolean(hardnessEstimate && hardnessNum !== null);

  const chemicalAssessments = chemicals.map(({ value, config, key }) => {
    const num = parseVal(value);
    if (num === null) return { key, name: config.name, status: "notDetected" as const };
    const ratio = num / config.limit;
    if (ratio > 0.85) return { key, name: config.name, status: "attention" as const };
    if (ratio >= 0.6) return { key, name: config.name, status: "moderate" as const };
    return { key, name: config.name, status: "fine" as const };
  });
  const chemicalsNeedAttention = chemicalAssessments.some((c) => c.status === "attention");

  const namesByStatus = {
    attention: chemicalAssessments
      .filter((c) => c.status === "attention")
      .map((c) => c.name),
    moderate: chemicalAssessments.filter((c) => c.status === "moderate").map((c) => c.name),
    fine: chemicalAssessments.filter((c) => c.status === "fine").map((c) => c.name),
    notDetected: chemicalAssessments
      .filter((c) => c.status === "notDetected")
      .map((c) => c.name.toLowerCase()),
  };

  function formatList(items: string[]): string {
    if (items.length <= 1) return items[0] ?? "";
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  }

  function chemicalSummaryLine(): string {
    const clauses: string[] = [];
    if (namesByStatus.attention.length > 0) {
      clauses.push(
        `${formatList(namesByStatus.attention)} ${
          namesByStatus.attention.length === 1 ? "needs" : "need"
        } attention.`
      );
    }
    if (namesByStatus.moderate.length > 0) {
      clauses.push(
        `${formatList(namesByStatus.moderate)} ${
          namesByStatus.moderate.length === 1 ? "is" : "are"
        } near ${namesByStatus.moderate.length === 1 ? "its limit." : "their limits."}`
      );
    }
    if (namesByStatus.attention.length === 0 && namesByStatus.moderate.length === 0) {
      if (namesByStatus.fine.length > 0) {
        clauses.push("All tested chemicals are well within safe limits.");
      } else {
        clauses.push("No local chemical detections were reported.");
      }
    } else if (namesByStatus.fine.length > 0) {
      clauses.push("Other chemicals are within safe limits.");
    }
    if (namesByStatus.notDetected.length > 0) {
      clauses.push(
        `${formatList(namesByStatus.notDetected)} ${
          namesByStatus.notDetected.length === 1 ? "was" : "were"
        } not detected in local sampling.`
      );
    }
    return clauses.join(" ");
  }

  const hasSpills = data.sewageSpills?.some((s) => s.spills > 0) ?? false;
  const spillSites = data.sewageSpills?.filter((s) => s.spills > 0) ?? [];
  const worstSpill = [...spillSites].sort((a, b) => b.spills - a.spills)[0];
  const summaryNeedsAttention = chemicalsNeedAttention || hasSpills;

  const allCards = [
    ...chemicals.map(({ key, value, config }) => (
      <div
        key={key}
        className="min-w-0 rounded-lg border border-[#0f2942]/10 bg-[#f8fafc] p-3"
      >
        <p className="font-semibold text-sm text-[#0f2942]">{config.name}</p>
        <p className="mt-1 font-bold tabular-nums text-xl text-[#1e293b]">
          {parseVal(value) === null ? (
            <span className="text-[#475569]">ND</span>
          ) : (
            <>
              {fmt(value)} <span className="text-sm font-normal text-[#64748b]">{config.unit}</span>
            </>
          )}
        </p>
        {parseVal(value) === null ? (
          <p className="mt-1 text-xs text-[#94a3b8]">
            Not found in local samples · area average is within limits
          </p>
        ) : null}
        <GaugeBar value={value} config={config} />
      </div>
    )),
    ...(hardnessNum !== null
      ? [
          <div
            key="hardness"
            className={`min-w-0 rounded-lg p-3 ${
              hardnessIsEstimate
                ? "border-2 border-dashed border-[#d97706]/50 bg-amber-50/60"
                : "border border-[#0f2942]/10 bg-[#f8fafc]"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm text-[#0f2942]">Hardness</p>
              {hardnessIsEstimate ? (
                <span className="rounded-full bg-amber-200/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#92400e]">
                  Estimated
                </span>
              ) : null}
            </div>
            {hardnessIsEstimate && hardnessEstimate ? (
              <p className="mt-1 text-base font-semibold text-[#78350f]">
                Estimated: {hardnessEstimateCategoryLabel(hardnessEstimate.category)} (~
                {hardnessNum.toFixed(0)} mg/L CaCO₃)
              </p>
            ) : (
              <p className="mt-1 font-bold tabular-nums text-xl text-[#1e293b]">
                {hardnessNum.toFixed(0)}{" "}
                <span className="text-sm font-normal text-[#64748b]">mg/L CaCO₃</span>
              </p>
            )}
            <HardnessGaugeBar value={hardnessNum} />
            {hardnessIsEstimate && hardnessEstimate ? (
              <p className="mt-2 line-clamp-3 text-[11px] leading-snug text-[#57534e]">
                {getHardnessEstimateExplanation(
                  hardnessEstimate.regionLabel,
                  hardnessEstimate.category
                )}
              </p>
            ) : null}
            {hardnessNum > 200 && (
              <a
                href="https://www.harveywatersofteners.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-xs text-[#0891b2] hover:underline"
              >
                Consider water softener →
              </a>
            )}
          </div>,
        ]
      : []),
  ];

  return (
    <div className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wider text-[#64748b]">
        Water supplier
      </p>
      <p className="mt-1 text-xl font-bold text-[#0f2942]">{displaySupplier}</p>
      <p className="mt-1 text-xs text-[#64748b]">
        Latest available data | {sourceText}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {hasSpills ? (
          <span className="rounded-md bg-[#d97706]/20 px-2.5 py-1 text-xs font-semibold text-[#d97706]">
            ⚠️ Sewage spills nearby
          </span>
        ) : chemicalsNeedAttention ? (
          <span className="rounded-md bg-[#d97706]/20 px-2.5 py-1 text-xs font-semibold text-[#d97706]">
            ⚠️ Chemicals need attention
          </span>
        ) : (
          <span className="rounded-md bg-[#22c55e]/20 px-2.5 py-1 text-xs font-semibold text-[#22c55e]">
            ✓ All checks passed
          </span>
        )}
      </div>

      <div
        className={`mt-4 rounded-r-lg border-l-4 bg-[#f8fafc] py-2 px-3 ${
          summaryNeedsAttention ? "border-l-[#d97706]" : "border-l-[#22c55e]"
        }`}
      >
        <p className="text-sm">
          <span className={chemicalsNeedAttention ? "text-[#d97706]" : "text-[#22c55e]"}>
            {chemicalsNeedAttention ? "⚠️ " : "✅ "}
            {chemicalSummaryLine()}
          </span>
        </p>
        <p className="mt-0.5 text-sm">
          {hasSpills && worstSpill ? (
            <span className="text-[#d97706]">
              ⚠️ {spillSites.length} storm overflow(s) nearby · worst: {worstSpill.spills} spills
              ({worstSpill.year})
            </span>
          ) : (
            <span className="text-[#22c55e]">✅ No storm overflows recorded nearby</span>
          )}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {allCards}
      </div>

      <div className="mt-6 w-full">
        {data.sewageSpills?.some((s) => s.spills > 0) ? (
          <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🚨</span>
              <h3 className="font-semibold text-[#0f2942]">Storm Overflow Spills</h3>
              <span className="ml-auto text-xs text-[#64748b]">within 2km</span>
            </div>
            <div className="space-y-2">
              {data.sewageSpills.map((site) => (
                <div key={site.name} className="flex justify-between items-start text-sm">
                  <span className="text-[#1e293b] truncate max-w-[60%]">{site.name}</span>
                  <span
                    className={`font-medium tabular-nums ${
                      site.spills > 20
                        ? "text-[#dc2626]"
                        : site.spills > 10
                          ? "text-[#d97706]"
                          : "text-[#64748b]"
                    }`}
                  >
                    {site.spills} spills · {site.hours}h
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#64748b] mt-3">
              EA storm overflow data
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-[#0f2942]/10 bg-[#f8fafc] p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <div>
                <h3 className="font-semibold text-[#0f2942]">Storm Overflows</h3>
                <p className="text-sm text-[#64748b]">No spills recorded within 2km</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
