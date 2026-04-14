"use client";

import type { TownWaterChemicals } from "@/lib/town-water";
import { parseChemNumber } from "@/lib/water-chemical-format";

type GaugeConfig = {
  name: string;
  unit: string;
  limit: number;
  amberStart: number;
  redStart: number;
};

const GAUGE_CONFIG: Record<string, GaugeConfig> = {
  nitrates: {
    name: "Nitrates",
    unit: "mg/L",
    limit: 50,
    amberStart: 0.5,
    redStart: 1,
  },
  chlorine: {
    name: "Chlorine",
    unit: "mg/L",
    limit: 0.5,
    amberStart: 0.6,
    redStart: 1,
  },
  fluoride: {
    name: "Fluoride",
    unit: "mg/L",
    limit: 1.5,
    amberStart: 0.9,
    redStart: 1,
  },
  lead: {
    name: "Lead",
    unit: "µg/L",
    limit: 10,
    amberStart: 0.5,
    redStart: 1,
  },
};

const HARDNESS_MAX = 400;

function formatReading(val: number | string | null | undefined): string {
  const n = parseChemNumber(val);
  if (n === null) return "ND";
  if (typeof val === "string" && String(val).includes("<")) return val;
  return n.toFixed(2);
}

function GaugeBar({
  value,
  config,
}: {
  value: number | string | null;
  config: GaugeConfig;
}) {
  const num = parseChemNumber(value);
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
        PCV / limit: {config.limit} {config.unit}
      </p>
    </div>
  );
}

function HardnessGaugeBar({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <div className="mt-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]" />
        <p className="mt-1 text-xs text-[#64748b]">—</p>
      </div>
    );
  }

  const pct = Math.min((value / HARDNESS_MAX) * 100, 98);
  let category: "soft" | "moderate" | "hard" | "veryhard" = "soft";
  if (value > 300) category = "veryhard";
  else if (value > 200) category = "hard";
  else if (value > 100) category = "moderate";

  const colors = {
    soft: "text-[#2563eb]",
    moderate: "text-[#22c55e]",
    hard: "text-[#d97706]",
    veryhard: "text-[#dc2626]",
  };
  const labels = {
    soft: "Soft",
    moderate: "Moderately hard",
    hard: "Hard",
    veryhard: "Very hard",
  };

  return (
    <div className="mt-2">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
        <div className="absolute left-0 top-0 h-full rounded-l-full bg-[#2563eb]" style={{ width: "25%" }} />
        <div className="absolute top-0 h-full bg-[#22c55e]" style={{ left: "25%", width: "25%" }} />
        <div className="absolute top-0 h-full bg-[#d97706]" style={{ left: "50%", width: "25%" }} />
        <div className="absolute right-0 top-0 h-full rounded-r-full bg-[#dc2626]" style={{ width: "25%" }} />
        <div
          className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0f2942] shadow-sm"
          style={{ left: `${pct}%` }}
        />
      </div>
      <p className={`mt-1 text-xs font-medium ${colors[category]}`}>{labels[category]}</p>
    </div>
  );
}

type Props = { chemicals: TownWaterChemicals };

export function TownWaterGauges({ chemicals }: Props) {
  const rows = [
    { key: "nitrates" as const, value: chemicals.nitrates, config: GAUGE_CONFIG.nitrates },
    { key: "chlorine" as const, value: chemicals.chlorine, config: GAUGE_CONFIG.chlorine },
    { key: "fluoride" as const, value: chemicals.fluoride, config: GAUGE_CONFIG.fluoride },
    { key: "lead" as const, value: chemicals.lead, config: GAUGE_CONFIG.lead },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {rows.map(({ key, value, config }) => (
        <div
          key={key}
          className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 shadow-sm"
        >
          <p className="font-semibold text-sm text-[#0f2942]">{config.name}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[#1e293b]">
            {parseChemNumber(value) === null ? (
              <span className="text-[#475569]">ND</span>
            ) : (
              <>
                {formatReading(value)}{" "}
                <span className="text-sm font-normal text-[#64748b]">{config.unit}</span>
              </>
            )}
          </p>
          {parseChemNumber(value) === null ? (
            <p className="mt-1 text-xs text-[#94a3b8]">
              Not found in local samples · area average is within limits
            </p>
          ) : null}
          <GaugeBar value={value} config={config} />
        </div>
      ))}
      {chemicals.hardness != null && (
        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 shadow-sm sm:col-span-2">
          <p className="font-semibold text-sm text-[#0f2942]">Hardness (as CaCO₃)</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[#1e293b]">
            {chemicals.hardness.toFixed(0)}{" "}
            <span className="text-sm font-normal text-[#64748b]">mg/L CaCO₃</span>
          </p>
          <HardnessGaugeBar value={chemicals.hardness} />
        </div>
      )}
    </div>
  );
}
