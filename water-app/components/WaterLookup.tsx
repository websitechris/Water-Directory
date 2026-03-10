"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { WaterScorecard } from "./WaterScorecard";
import type { WaterScorecardData } from "./WaterScorecard";
import type { WaterApiResponse } from "@/types/water";

const MIN_STEP_MS = 800;
const MIN_TOTAL_MS = 2500;
const DONE_DISPLAY_MS = 600;

type WaterLookupProps = {
  initialPostcode?: string;
};

export function WaterLookup({ initialPostcode }: WaterLookupProps) {
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [postcode, setPostcode] = useState(initialPostcode ?? "");
  const [homeBuilt, setHomeBuilt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    data: WaterApiResponse;
    searchValue: string;
  } | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [loadingStep, setLoadingStep] = useState<1 | 2 | 3 | "done">(1);
  const [loadingData, setLoadingData] = useState<{
    supplier: string;
    adminDistrict: string | null;
    sewageCount: number;
  } | null>(null);
  const pendingResultRef = useRef<{
    data: WaterApiResponse;
    searchValue: string;
  } | null>(null);
  const apiReturnedRef = useRef(false);

  // Step progression: min 800ms per step, min 2.5s total, 600ms after done
  useEffect(() => {
    if (!loading) return;
    setLoadingStep(1);
    setLoadingData(null);
    pendingResultRef.current = null;
    apiReturnedRef.current = false;
    const loadStart = Date.now();
    let cancelled = false;

    const advanceToStep2 = () => {
      if (cancelled) return;
      setLoadingStep(2);
      const elapsed = Date.now() - loadStart;
      const delay = Math.max(MIN_STEP_MS, MIN_TOTAL_MS / 3 - elapsed);
      setTimeout(advanceToStep3, delay);
    };
    const advanceToStep3 = () => {
      if (cancelled) return;
      setLoadingStep(3);
      const elapsed = Date.now() - loadStart;
      const delay = Math.max(MIN_STEP_MS, (MIN_TOTAL_MS * 2) / 3 - elapsed);
      setTimeout(() => {
        if (cancelled) return;
        setLoadingStep("done");
        const totalElapsed = Date.now() - loadStart;
        const doneDelay = Math.max(DONE_DISPLAY_MS, MIN_TOTAL_MS - totalElapsed);
        setTimeout(finishLoading, doneDelay);
      }, delay);
    };
    const finishLoading = () => {
      if (cancelled) return;
      const pr = pendingResultRef.current;
      if (pr) {
        setResult(pr);
        pendingResultRef.current = null;
      }
      setLoading(false);
      setLoadingStep(1);
      setLoadingData(null);
      apiReturnedRef.current = false;
    };

    const checkStep1 = () => {
      if (cancelled) return;
      const elapsed = Date.now() - loadStart;
      const hasData = apiReturnedRef.current;
      if (hasData && elapsed >= MIN_STEP_MS) {
        advanceToStep2();
      } else {
        setTimeout(checkStep1, 50);
      }
    };
    const id = setInterval(checkStep1, 50);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [loading]);

  // Auto-search when landing with postcode in URL
  useEffect(() => {
    if (initialPostcode) {
      setPostcode(initialPostcode);
      handleSearch(initialPostcode);
    }
  }, []);

  function handleSearch(postcodeOverride?: string) {
    const raw = (postcodeOverride ?? postcode).trim();
    if (!raw) {
      alert("Please enter a postcode or Eircode");
      return;
    }
    const formatted =
      raw.length === 3 ? raw : raw.replace(/\s+/g, " ").trim().toUpperCase();
    setLoading(true);
    setError(null);
    setResult(null);
    router.push(`/?postcode=${encodeURIComponent(formatted)}`);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    fetch(`/api/water?postcode=${encodeURIComponent(raw)}`)
      .then((res) => res.json())
      .then((data: WaterApiResponse) => {
        if (!data.error) {
          const searchValue =
            raw.length === 3 ? raw : raw.replace(/\s+/g, " ").trim().toUpperCase();
          pendingResultRef.current = { data, searchValue };
          apiReturnedRef.current = true;
          setLoadingData({
            supplier: data.supplier ?? "Your area",
            adminDistrict: data.adminDistrict ?? null,
            sewageCount: data.sewageSpills?.length ?? 0,
          });
        } else {
          setError(data.error || "Search failed");
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Search failed. Please try again.");
        setLoading(false);
      });
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
        hasLocalSamples: result.data.hasLocalSamples,
        supplier: result.data.supplier,
        zoneName: result.data.zoneName,
        propertyValueImpact: hasLeadRisk ? "high" : "low",
        familyHealthScore: familyWarning ? "review" : "good",
        sewageSpills: result.data.sewageSpills,
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
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
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

      {/* Loading panel — above hub cards, reserved height to prevent layout jump */}
      <div ref={resultsRef} className={loading ? "min-h-[220px] sm:min-h-[240px]" : undefined}>
      {loading && (
        <section className="w-full bg-[#0f2942] px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-2xl">
            {/* Step 1 */}
            {(loadingStep === 1 || loadingStep === 2 || loadingStep === 3 || loadingStep === "done") && (
              <div
                className={`flex items-center gap-3 py-3 ${
                  (loadingStep === 2 || loadingStep === 3 || loadingStep === "done") ? "opacity-100" : "animate-[fadeIn_0.3s_ease-in]"
                }`}
              >
                <div className="relative h-8 w-8 shrink-0">
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-out ${
                      (loadingStep === 2 || loadingStep === 3 || loadingStep === "done") ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-out ${
                      (loadingStep === 2 || loadingStep === 3 || loadingStep === "done") ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e] text-white text-sm font-bold">
                      ✓
                    </span>
                  </div>
                </div>
                <span className="text-white">
                  {(loadingStep === 2 || loadingStep === 3 || loadingStep === "done")
                    ? `✓ Postcode found — ${loadingData?.supplier ?? "..."}${loadingData?.adminDistrict ? `, ${loadingData.adminDistrict}` : ""}`
                    : "Finding your postcode..."}
                </span>
              </div>
            )}

            {/* Step 2 */}
            {(loadingStep === 2 || loadingStep === 3 || loadingStep === "done") && (
              <div
                className={`flex items-center gap-3 py-3 ${
                  (loadingStep === 3 || loadingStep === "done") ? "opacity-100" : "animate-[fadeIn_0.3s_ease-in]"
                }`}
              >
                <div className="relative h-8 w-8 shrink-0">
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-out ${
                      (loadingStep === 3 || loadingStep === "done") ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-out ${
                      (loadingStep === 3 || loadingStep === "done") ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e] text-white text-sm font-bold">
                      ✓
                    </span>
                  </div>
                </div>
                <span className="text-white">
                  {(loadingStep === 3 || loadingStep === "done")
                    ? "✓ Nitrates, chlorine, fluoride and lead loaded"
                    : "Loading chemical readings..."}
                </span>
              </div>
            )}

            {/* Step 3 */}
            {(loadingStep === 3 || loadingStep === "done") && (
              <div
                className={`flex items-center gap-3 py-3 ${
                  loadingStep === "done" ? "opacity-100" : "animate-[fadeIn_0.3s_ease-in]"
                }`}
              >
                <div className="relative h-8 w-8 shrink-0">
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-out ${
                      loadingStep === "done" ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-out ${
                      loadingStep === "done" ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e] text-white text-sm font-bold">
                      ✓
                    </span>
                  </div>
                </div>
                <span className="text-white">
                  {loadingStep === "done"
                    ? `✓ ${loadingData?.sewageCount ?? 0} overflow site${(loadingData?.sewageCount ?? 0) === 1 ? "" : "s"} found within 2km`
                    : "Checking sewage spills nearby..."}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

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
      </div>

      {/* Stats + audience entry points */}
      <section className="border-t border-[#0f2942]/10 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <p className="font-bold tabular-nums text-3xl text-[#0891b2] sm:text-4xl">
                16
              </p>
              <p className="mt-1 text-sm font-medium text-[#0f2942]">
                water companies covered
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold tabular-nums text-3xl text-[#0891b2] sm:text-4xl">
                100,000+
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
