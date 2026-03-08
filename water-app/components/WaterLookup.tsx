"use client";

import { useState } from "react";
import { WaterScorecard } from "./WaterScorecard";
import type { WaterScorecardData } from "./WaterScorecard";
import type { WaterApiResponse } from "@/types/water";

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
        hardness: result.data.chemicals.hardness ?? null,
        pfas: "N/A",
        hasLocalSamples: result.data.hasLocalSamples,
        supplier: result.data.supplier,
        zoneName: result.data.zoneName,
        propertyValueImpact: hasLeadRisk ? "high" : "low",
        familyHealthScore: familyWarning ? "review" : "good",
      }
    : null;

  return (
    <>
      {/* Hero — postcode search */}
      <section className="px-4 pt-12 pb-10 sm:pt-16 sm:pb-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-center text-3xl font-bold tracking-tight text-[#0f2942] sm:text-4xl">
            What&apos;s actually in your tap water?
          </h1>
          <p className="mt-3 text-center text-base text-[#1e293b]/80 sm:text-lg">
            Real 2024 lab data for every UK postcode
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-3"
          >
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="Enter postcode or Eircode"
              className="min-h-[52px] flex-1 rounded-lg border-2 border-[#0f2942]/20 bg-white px-4 py-3 text-lg text-[#1e293b] placeholder:text-[#64748b] focus:border-[#0891b2] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-[52px] rounded-lg bg-[#0891b2] px-8 font-semibold text-white transition hover:bg-[#0e7490] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2 text-sm text-[#1e293b]">
              <span className="font-medium">When was your home built?</span>
              <select
                value={homeBuilt}
                onChange={(e) => setHomeBuilt(e.target.value)}
                className="rounded border border-[#0f2942]/20 bg-white px-3 py-1.5 text-[#1e293b] focus:border-[#0891b2] focus:outline-none"
              >
                <option value="">Select…</option>
                <option value="pre-1970">Pre-1970</option>
                <option value="post-1970">Post-1970</option>
              </select>
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-[#dc2626]/30 bg-[#dc2626]/10 p-4 text-[#dc2626]">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Stats + audience entry points — always visible below search */}
      <section className="border-t border-[#0f2942]/10 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <p className="font-bold tabular-nums text-3xl text-[#0891b2] sm:text-4xl">
                13
              </p>
              <p className="mt-1 text-sm font-medium text-[#0f2942]">
                water companies covered
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold tabular-nums text-3xl text-[#0891b2] sm:text-4xl">
                90,000+
              </p>
              <p className="mt-1 text-sm font-medium text-[#0f2942]">
                zones mapped
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold tabular-nums text-3xl text-[#0891b2] sm:text-4xl">
                DWI
              </p>
              <p className="mt-1 text-sm font-medium text-[#0f2942]">
                real lab data
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-[#64748b]">
            Data sourced from the Drinking Water Inspectorate via the Stream open
            data initiative
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <a
              href="/water-quality-for-babies"
              className="block rounded-lg border border-[#0f2942]/10 bg-white p-6 transition hover:border-[#0891b2]/30 hover:shadow-md"
            >
              <p className="font-semibold text-[#0f2942]">New baby at home?</p>
              <p className="mt-2 text-sm text-[#64748b]">
                Nitrates, lead and formula — what parents need to know
              </p>
              <p className="mt-3 text-sm font-medium text-[#0891b2]">
                Parents hub →
              </p>
            </a>
            <a
              href="/hard-water-skin-health"
              className="block rounded-lg border border-[#0f2942]/10 bg-white p-6 transition hover:border-[#0891b2]/30 hover:shadow-md"
            >
              <p className="font-semibold text-[#0f2942]">Dry skin or eczema?</p>
              <p className="mt-2 text-sm text-[#64748b]">
                Hard water and skin — the evidence
              </p>
              <p className="mt-3 text-sm font-medium text-[#0891b2]">
                Skin & health hub →
              </p>
            </a>
            <a
              href="/water-quality-home-buying"
              className="block rounded-lg border border-[#0f2942]/10 bg-white p-6 transition hover:border-[#0891b2]/30 hover:shadow-md"
            >
              <p className="font-semibold text-[#0f2942]">Just bought a house?</p>
              <p className="mt-2 text-sm text-[#64748b]">
                What to check before you exchange
              </p>
              <p className="mt-3 text-sm font-medium text-[#0891b2]">
                Homebuyers hub →
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* Results */}
      {result && (
        <section className="border-t border-[#0f2942]/10 bg-white px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-xl font-bold text-[#0f2942] sm:text-2xl">
              Water Quality Report
              {result.data.comingSoon
                ? ""
                : result.data.adminDistrict
                  ? ` for ${result.data.adminDistrict}`
                  : ""}
            </h2>

            {result.data.comingSoon ? (
              <div className="mt-6 rounded-lg border border-[#0f2942]/10 bg-[#f8fafc] p-6">
                <p className="font-semibold text-[#0f2942]">Scottish Water</p>
                <p className="mt-2 text-[#1e293b]">
                  We&apos;re working on bringing Scottish water quality data to the
                  directory. In the meantime, check your local water quality at{" "}
                  <a
                    href="https://www.scottishwater.co.uk/your-home/your-water/water-quality/water-quality"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#0891b2] underline hover:text-[#0e7490]"
                  >
                    scottishwater.co.uk
                  </a>
                </p>
              </div>
            ) : scorecardData ? (
              <>
                <WaterScorecard data={scorecardData} />
                {(() => {
                  const spill = result.data.nearestSpill;
                  const spills = spill?.countedSpills ?? 0;
                  const hasSpills = spills > 0;
                  return (
                    <div
                      className={`mt-6 rounded-lg border p-4 ${
                        hasSpills
                          ? "border-[#dc2626]/30 bg-[#dc2626]/5"
                          : "border-[#0f2942]/10 bg-[#f8fafc]"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          hasSpills ? "text-[#dc2626]" : "text-[#0f2942]"
                        }`}
                      >
                        {hasSpills ? "Local Pollution Alert" : "No Spills Recorded Near You"}
                      </p>
                      {hasSpills && spill && (
                        <>
                          <p className="mt-1 font-medium text-[#1e293b]">
                            {spill.siteName}
                          </p>
                          <p className="text-sm text-[#64748b]">
                            {spill.countedSpills.toLocaleString()}{" "}
                            {spill.countedSpills === 1 ? "spill" : "spills"}
                            {spill.totalDurationHrs != null && spill.totalDurationHrs > 0
                              ? ` · ${spill.totalDurationHrs.toFixed(1)} hrs total`
                              : " recorded"}
                          </p>
                        </>
                      )}
                      <p className="mt-1 text-xs text-[#64748b]">
                        Source: Rivers Trust 2024 EDM
                      </p>
                    </div>
                  );
                })()}
                {hasLeadRisk && (
                  <div className="mt-6 rounded-lg border border-[#d97706]/30 bg-[#d97706]/5 p-4">
                    <p className="font-semibold text-[#d97706]">Lead pipe warning</p>
                    <p className="mt-1 text-sm text-[#1e293b]">
                      Homes built before 1970 often have lead pipes or lead solder in
                      plumbing. Lead can leach into drinking water and pose health
                      risks, especially for children. Consider having your water
                      tested and replacing lead pipes.
                    </p>
                  </div>
                )}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setLeadModalOpen(true)}
                    disabled={leadSubmitted}
                    className="rounded-lg bg-[#0f2942] px-4 py-2 font-semibold text-white hover:bg-[#1e3a5f] disabled:cursor-not-allowed disabled:bg-[#22c55e]"
                  >
                    {leadSubmitted ? "Survey requested ✓" : "Request professional water survey"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </section>
      )}

      {/* Lead Modal */}
      {leadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !leadSubmitted && setLeadModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {leadSubmitted ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#22c55e] text-2xl font-bold text-white">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-[#0f2942]">Thank you</h3>
                <p className="mt-2 text-[#64748b]">
                  Your request has been received. A local water quality expert will
                  contact you shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setLeadModalOpen(false)}
                  className="mt-4 rounded-lg bg-[#0891b2] px-6 py-2 font-semibold text-white"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-[#0f2942]">
                  Request professional water survey
                </h3>
                <form onSubmit={handleLeadSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b]">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="Your name"
                      className="mt-1 w-full rounded-lg border border-[#0f2942]/20 px-3 py-2 focus:border-[#0891b2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b]">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="you@example.com"
                      className="mt-1 w-full rounded-lg border border-[#0f2942]/20 px-3 py-2 focus:border-[#0891b2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b]">
                      Postcode
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      placeholder="e.g. BN11 3BY"
                      defaultValue={result?.searchValue}
                      className="mt-1 w-full rounded-lg border border-[#0f2942]/20 px-3 py-2 focus:border-[#0891b2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b]">
                      Property age
                    </label>
                    <select
                      name="property_age"
                      defaultValue={homeBuilt}
                      className="mt-1 w-full rounded-lg border border-[#0f2942]/20 px-3 py-2 focus:border-[#0891b2] focus:outline-none"
                    >
                      <option value="">Select…</option>
                      <option value="pre-1970">Pre-1970</option>
                      <option value="post-1970">Post-1970</option>
                    </select>
                  </div>
                  <input type="hidden" name="interest_type" value="" />
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setLeadModalOpen(false)}
                      className="flex-1 rounded-lg border border-[#0f2942]/20 bg-[#f8fafc] px-4 py-2 font-semibold text-[#1e293b]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-[#0891b2] px-4 py-2 font-semibold text-white"
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
    </>
  );
}
