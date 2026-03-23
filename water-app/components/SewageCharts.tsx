"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import type { SpillSite } from "@/types/water";
import { spillSeverity, toTitleCase } from "@/lib/toTitleCase";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip);

const TEAL = "#0891b2";
const RED = "#dc2626";
const AMBER = "#d97706";
const SLATE = "#64748b";

type Props = {
  sites: SpillSite[];
};

export function SewageCharts({ sites }: Props) {
  const top10 = useMemo(() => sites.slice(0, 10), [sites]);

  const barData = useMemo(() => {
    const labels = top10.map((s) => toTitleCase(s.name));
    const spills = top10.map((s) => s.spills);
    const hours = top10.map((s) => s.hours);
    return { labels, spills, hours };
  }, [top10]);

  const doughnutBuckets = useMemo(() => {
    let critical = 0;
    let high = 0;
    let moderate = 0;
    let low = 0;
    for (const s of sites) {
      const sev = spillSeverity(s.spills);
      if (sev === "critical") critical++;
      else if (sev === "high") high++;
      else if (sev === "moderate") moderate++;
      else low++;
    }
    return { critical, high, moderate, low };
  }, [sites]);

  if (sites.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-8 text-center text-sm text-[#64748b]">
        No overflow sites in range — charts will appear when EA data is available
        for this area.
      </div>
    );
  }

  const barChartData = {
    labels: barData.labels,
    datasets: [
      {
        label: "Spills",
        data: barData.spills,
        backgroundColor: TEAL,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 28,
      },
    ],
  };

  const barOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f2942",
        padding: 12,
        callbacks: {
          title(items) {
            const i = items[0]?.dataIndex ?? 0;
            return barData.labels[i] ?? "";
          },
          label(item: TooltipItem<"bar">) {
            const i = item.dataIndex;
            const sp = item.parsed.x ?? 0;
            const hr = barData.hours[i] ?? 0;
            return [
              `Spills: ${Number(sp).toLocaleString()}`,
              `Hours: ${hr.toLocaleString()}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Total Number of Spills",
          color: "#64748b",
          font: { size: 12, weight: 500 },
        },
        grid: { color: "#e2e8f0" },
        ticks: { color: "#64748b" },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: "#0f2942",
          font: { size: 11 },
          autoSkip: false,
        },
      },
    },
  };

  const d = doughnutBuckets;
  const doughnutData = {
    labels: ["Critical (>100)", "High (50–100)", "Moderate (10–49)", "Low (<10)"],
    datasets: [
      {
        data: [d.critical, d.high, d.moderate, d.low],
        backgroundColor: [RED, AMBER, TEAL, SLATE],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f2942",
        padding: 12,
        callbacks: {
          label(item: TooltipItem<"doughnut">) {
            const n = item.parsed;
            const label = item.label ?? "";
            return ` ${label}: ${n} site${n === 1 ? "" : "s"}`;
          },
        },
      },
    },
  };

  const legendItems = [
    { label: "Critical (>100 spills)", color: RED, count: d.critical },
    { label: "High (50–100 spills)", color: AMBER, count: d.high },
    { label: "Moderate (10–49 spills)", color: TEAL, count: d.moderate },
    { label: "Low (<10 spills)", color: SLATE, count: d.low },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div
        className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] lg:col-span-2"
        style={{ minHeight: Math.max(280, top10.length * 36 + 120) }}
      >
        <h3 className="mb-4 text-sm font-semibold text-[#0f2942]">
          Top 10 sites by spill count
        </h3>
        <div className="h-[min(420px,calc(100vh-12rem))] min-h-[260px] w-full">
          <Bar data={barChartData} options={barOptions} />
        </div>
      </div>

      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] lg:col-span-1">
        <h3 className="mb-2 text-center text-sm font-semibold text-[#0f2942]">
          Sites by severity
        </h3>
        <div className="relative mx-auto aspect-square max-h-[280px] w-full max-w-[280px]">
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
            <span className="text-3xl font-bold tabular-nums text-[#0f2942]">
              {sites.length}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-[#64748b]">
              sites
            </span>
          </div>
        </div>
        <ul className="mt-4 space-y-2 border-t border-[#e2e8f0] pt-4">
          {legendItems.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-2 text-xs text-[#475569]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-[#0f2942]">
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
