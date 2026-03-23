"use client";

import { useState } from "react";
import type { SpillSite } from "@/types/water";
import {
  durationTextClass,
  severityDotClass,
  spillSeverity,
  toTitleCase,
} from "@/lib/toTitleCase";

type Props = {
  sites: SpillSite[];
};

const INITIAL = 5;

export function SewageSitesTable({ sites }: Props) {
  const [expanded, setExpanded] = useState(false);
  const showExpand = sites.length > INITIAL;
  const visible = expanded ? sites : sites.slice(0, INITIAL);

  if (sites.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              <th className="rounded-tl-2xl px-4 py-3 font-semibold text-[#0f2942]">
                Site name
              </th>
              <th className="px-4 py-3 font-semibold text-[#0f2942]">
                Water company
              </th>
              <th className="px-4 py-3 text-right font-semibold text-[#0f2942]">
                Spill count
              </th>
              <th className="rounded-tr-2xl px-4 py-3 text-right font-semibold text-[#0f2942]">
                Duration (hours)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {visible.map((site) => {
              const sev = spillSeverity(site.spills);
              return (
                <tr key={`${site.name}-${site.year}`} className="hover:bg-[#f8fafc]/80">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${severityDotClass(sev)}`}
                        title={sev}
                        aria-hidden
                      />
                      <span className="font-medium text-[#1e293b]">
                        {toTitleCase(site.name)}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#64748b]">
                    {site.company || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#0f2942]">
                    {site.spills.toLocaleString()}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${durationTextClass(site.hours)}`}
                  >
                    {site.hours.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showExpand && (
        <div className="border-t border-[#e2e8f0] px-4 py-3 text-center">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-sm font-semibold text-[#0891b2] hover:underline"
          >
            {expanded
              ? "Show fewer sites"
              : `View all ${sites.length} sites`}
          </button>
        </div>
      )}
    </div>
  );
}
