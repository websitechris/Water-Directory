"use client";

import { useState } from "react";
import { WaterScorecard } from "./WaterScorecard";
import type { WaterScorecardData } from "./WaterScorecard";
import type { WaterApiResponse } from "@/types/water";

function getTownFromPostcode(postcode: string): string {
  const prefix = postcode.replace(/\s/g, "").substring(0, 2).toUpperCase();
  const area = postcode.replace(/\s/g, "").substring(0, 1).toUpperCase();
  const map: Record<string, string> = {
    PO: "Portsmouth",
    M: "Manchester",
    BN: "Brighton",
    B: "Birmingham",
    L: "Liverpool",
    S: "Sheffield",
    LS: "Leeds",
    SW: "London",
    SE: "London",
    NW: "London",
    N: "London",
    E: "London",
    W: "London",
    EC: "London",
    WC: "London",
    BS: "Bristol",
    OX: "Oxford",
    CB: "Cambridge",
    NG: "Nottingham",
    AB: "Aberdeen",
    EH: "Edinburgh",
    G: "Glasgow",
    D: "Dublin",
  };
  return map[prefix] || map[area] || "your area";
}

export function WaterLookup() {
  const [postcode, setPostcode] = useState("");
  const [homeBuilt, setHomeBuilt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    data: WaterApiResponse;
    searchValue: string;
  } | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const raw = postcode.trim();
    if (!raw) {
      alert("Please enter a postcode or Eircode");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/water?postcode=${encodeURIComponent(raw)}`);
      const data: WaterApiResponse = await res.json();

      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }

      const searchValue =
        raw.length === 3 ? raw : raw.replace(/\s+/g, " ").trim().toUpperCase();
      setResult({ data, searchValue });
    } catch (err) {
      setError("Search failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLeadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: formData.get("name")?.toString().trim() ?? "",
      email: formData.get("email")?.toString().trim() ?? "",
      postcode: formData.get("postcode")?.toString().trim() ?? "",
      property_age: formData.get("property_age")?.toString() ?? "",
      interest_type: formData.get("interest_type")?.toString() ?? "",
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      setLeadSubmitted(true);
    } catch {
      alert("Something went wrong. Please try again.");
    }
  }

  const hasLeadRisk = homeBuilt === "pre-1970";
  const nitratesNum = result?.data.chemicals.nitrates
    ? (typeof result.data.chemicals.nitrates === "string"
        ? parseFloat(String(result.data.chemicals.nitrates).replace("<", ""))
        : Number(result.data.chemicals.nitrates)) ?? 0
    : 0;
  const leadNum = result?.data.chemicals.lead
    ? (typeof result.data.chemicals.lead === "string"
        ? parseFloat(String(result.data.chemicals.lead).replace("<", ""))
        : Number(result.data.chemicals.lead)) ?? 0
    : 0;
  const familyWarning = nitratesNum > 25 || leadNum > 10;

  const scorecardData: WaterScorecardData | null = result
    ? {
        nitrates: result.data.chemicals.nitrates,
        lead: result.data.chemicals.lead,
        chlorine: result.data.chemicals.chlorine,
        fluoride: result.data.chemicals.fluoride,
        pfas: "N/A",
        hasLocalSamples: result.data.hasLocalSamples,
        supplier: result.data.supplier,
        zoneName: result.data.zoneName,
        propertyValueImpact: hasLeadRisk ? "high" : "low",
        familyHealthScore: familyWarning ? "review" : "good",
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <h2 className="mb-2 text-2xl font-bold text-slate-800">💧 Water Lookup</h2>
      <p className="mb-6 text-slate-600">
        Enter your postcode to find your supplier
      </p>

      <form onSubmit={handleSearch} className="space-y-4">
        <input
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="Enter your UK Postcode or Eircode"
          className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 text-slate-800 focus:border-indigo-500 focus:outline-none"
        />
        <label className="block text-left text-sm font-medium text-slate-600">
          When was your home built?
        </label>
        <select
          value={homeBuilt}
          onChange={(e) => setHomeBuilt(e.target.value)}
          className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 text-slate-800 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Select...</option>
          <option value="pre-1970">Pre-1970</option>
          <option value="post-1970">Post-1970</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-lg px-4 py-3 font-bold text-white transition ${
            loading
              ? "cursor-not-allowed animate-pulse bg-indigo-400"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading
            ? "🔍 Analyzing local lab results & sewage data (this can take 10-15s)..."
            : "Search"}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {result && scorecardData && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h1 className="mb-4 text-xl font-bold text-slate-800">
            Water Quality Report for {getTownFromPostcode(result.searchValue)}
          </h1>
          <WaterScorecard data={scorecardData} />

          {(() => {
            const spill = result.data.nearestSpill;
            const spills = spill?.countedSpills ?? 0;
            const hasSpills = spills > 0;

            return (
              <div
                className={`mt-6 rounded-lg border p-4 ${
                  hasSpills
                    ? "border-red-200 bg-red-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div
                  className={`text-sm font-bold ${
                    hasSpills ? "text-red-800" : "text-slate-700"
                  }`}
                >
                  {hasSpills ? "Local Pollution Alert" : "No Spills Recorded Near You"}
                </div>
                {hasSpills ? (
                  <>
                    <div className="mt-1 font-semibold text-red-700">
                      {spill!.siteName}
                    </div>
                    <div className="text-sm text-red-600">
                      {spill!.countedSpills.toLocaleString()} spills
                      · {spill!.totalDurationHrs.toFixed(1)} hrs total
                    </div>
                  </>
                ) : null}
                <div className={`mt-1 text-xs ${hasSpills ? "text-red-500" : "text-slate-500"}`}>
                  Source: Rivers Trust 2024 EDM
                </div>
              </div>
            );
          })()}

          {hasLeadRisk && (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <div className="font-bold text-amber-800">
                ⚠️ Lead Pipe Warning
              </div>
              <p className="mt-1 text-sm text-amber-700">
                Homes built before 1970 often have lead pipes or lead solder in
                plumbing. Lead can leach into drinking water and pose health
                risks, especially for children. Consider having your water
                tested and replacing lead pipes.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setLeadModalOpen(true)}
              disabled={leadSubmitted}
              className="rounded-lg bg-slate-600 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:bg-green-600 disabled:cursor-not-allowed"
            >
              {leadSubmitted ? "Survey Requested ✓" : "Request Professional Water Survey"}
            </button>
          </div>
        </div>
      )}

      {/* Lead Modal */}
      {leadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !leadSubmitted && setLeadModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {leadSubmitted ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-2xl font-bold text-white">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-green-700">Thank You!</h3>
                <p className="mt-2 text-slate-600">
                  Your request has been securely received. One of our local water
                  quality experts will review your property details and contact
                  you shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setLeadModalOpen(false)}
                  className="mt-4 rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="mb-4 text-xl font-bold text-slate-800">
                  Request Professional Water Survey
                </h3>
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="Your name"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="you@example.com"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">
                      Postcode
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      placeholder="e.g. BN11 3BY"
                      defaultValue={result?.searchValue}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">
                      Property Age
                    </label>
                    <select
                      name="property_age"
                      defaultValue={homeBuilt}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <option value="">Select...</option>
                      <option value="pre-1970">Pre-1970</option>
                      <option value="post-1970">Post-1970</option>
                    </select>
                  </div>
                  <input
                    type="hidden"
                    name="interest_type"
                    value=""
                  />
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setLeadModalOpen(false)}
                      className="flex-1 rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
