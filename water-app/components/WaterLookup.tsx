"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WaterScorecard } from "./WaterScorecard";
import type { WaterScorecardData } from "./WaterScorecard";
import {
  displayRegionName,
  getEstimatedHardnessFromGeo,
} from "@/lib/hardness-estimate";
import type { WaterApiResponse } from "@/types/water";

type WaterLookupProps = {
  initialPostcode?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanSupplier(s: string): string {
  return s.replace(/\(.*$/, "").trim();
}

function step1CompleteLine(data: WaterApiResponse | undefined): string {
  if (!data) return "Postcode verified";
  const sup = cleanSupplier(data.supplier || "Your supplier");
  const town =
    data.adminDistrict?.trim() ||
    data.zoneName?.trim() ||
    "your area";
  return `Postcode found — ${sup}, ${town}`;
}

function step3CompleteLine(data: WaterApiResponse | undefined): string {
  if (!data) return "Lookup finished";
  const sites = data.sewageSpills ?? [];
  const withSpills = sites.filter((s) => s.spills > 0);
  const n = withSpills.length;
  if (n === 0) {
    return "No overflow sites with recorded spills within 2km";
  }
  return `${n} overflow site${n === 1 ? "" : "s"} found within 2km`;
}

/** Property age for lead-pipe context; only pre-1970 triggers the warning. */
type HomeBuiltValue = "pre-1970" | "post-1970" | "not-sure";

type PendingSuccessPayload = {
  data: WaterApiResponse;
  searchValue: string;
};

type StepPhase = "hidden" | "spin" | "done";

type LoadingUi = {
  fading: boolean;
  step1: { phase: StepPhase; line: string };
  step2: { phase: StepPhase; line: string };
  step3: { phase: StepPhase; line: string };
};

function StepRow({
  phase,
  line,
}: {
  phase: StepPhase;
  line: string;
}) {
  if (phase === "hidden") return null;
  const done = phase === "done";
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="relative mt-0.5 h-5 w-5 shrink-0">
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${
            done ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden
        >
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
        </div>
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${
            done ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden
        >
          <svg
            className="h-5 w-5 text-[#16a34a]"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      <p className="text-sm leading-snug text-white/95 sm:text-base">{line}</p>
    </div>
  );
}

const HOME_AGE_OPTIONS: { value: HomeBuiltValue; label: string }[] = [
  { value: "pre-1970", label: "Pre-1970" },
  { value: "post-1970", label: "Post-1970" },
  { value: "not-sure", label: "Not sure" },
];

function LoadingPanelHouseAge({
  selectedValue,
  onConfirm,
}: {
  selectedValue: HomeBuiltValue | null;
  onConfirm: (v: HomeBuiltValue) => void;
}) {
  return (
    <div
      className="mt-8 border-t border-white/15 pt-6"
      role="group"
      aria-label="When was your home built?"
    >
      <p className="text-base font-semibold text-white sm:text-lg">
        When was your home built?
      </p>
      <p className="mt-2 text-sm text-white/80">
        Select an option to see your results
      </p>
      <div className="house-age-pills-glow mt-6 flex flex-wrap gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:gap-4">
        {HOME_AGE_OPTIONS.map(({ value, label }) => {
          const selected = selectedValue === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onConfirm(value)}
              className={`rounded-full border-2 px-5 py-3 text-base font-semibold transition sm:px-6 sm:py-3.5 sm:text-lg ${
                selected
                  ? "border-[#0891b2] bg-[#0891b2] text-white shadow-md"
                  : "border-white/30 bg-white/10 text-white hover:border-white/60 hover:bg-white/15"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WaterLookup({ initialPostcode }: WaterLookupProps) {
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);
  const loadingPanelRef = useRef<HTMLDivElement>(null);
  const pendingSuccessRef = useRef<PendingSuccessPayload | null>(null);
  const [postcode, setPostcode] = useState(initialPostcode ?? "");
  const [homeBuilt, setHomeBuilt] = useState<HomeBuiltValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingUi, setLoadingUi] = useState<LoadingUi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    data: WaterApiResponse;
    searchValue: string;
  } | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [awaitingHouseSelection, setAwaitingHouseSelection] = useState(false);

  useEffect(() => {
    if (initialPostcode) {
      setPostcode(initialPostcode);
      void runSearch(initialPostcode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot initial URL search
  }, []);

  async function runSearch(postcodeOverride?: string) {
    const raw = (postcodeOverride ?? postcode).trim();
    if (!raw) {
      alert("Please enter a postcode or Eircode");
      return;
    }
    const formatted =
      raw.length === 3 ? raw : raw.replace(/\s+/g, " ").trim().toUpperCase();
    const searchValue =
      raw.length === 3 ? raw : raw.replace(/\s+/g, " ").trim().toUpperCase();

    setLoading(true);
    setError(null);
    setResult(null);
    setHomeBuilt(null);
    setAwaitingHouseSelection(false);
    pendingSuccessRef.current = null;
    setLoadingUi({
      fading: false,
      step1: { phase: "spin", line: "Looking up your postcode..." },
      step2: { phase: "hidden", line: "" },
      step3: { phase: "hidden", line: "" },
    });

    router.push(`/?postcode=${encodeURIComponent(formatted)}`);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        loadingPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });

    const startTime = Date.now();

    let resolvedData: WaterApiResponse | undefined;
    let fetchError: string | null = null;

    const dataPromise = fetch(`/api/water?postcode=${encodeURIComponent(raw)}`)
      .then(async (res) => {
        const data = (await res.json()) as WaterApiResponse;
        resolvedData = data;
        return data;
      })
      .catch(() => {
        fetchError = "Search failed. Please try again.";
        return undefined;
      });

    try {
      await sleep(400);
      const dataAt400 = resolvedData;
      setLoadingUi((prev) =>
        prev
          ? {
              ...prev,
              step1: {
                phase: "done",
                line: step1CompleteLine(dataAt400),
              },
            }
          : prev
      );

      await sleep(Math.max(0, 500 - (Date.now() - startTime)));
      setLoadingUi((prev) =>
        prev
          ? {
              ...prev,
              step2: {
                phase: "spin",
                line: "Fetching water quality data...",
              },
            }
          : prev
      );

      await sleep(Math.max(0, 900 - (Date.now() - startTime)));
      setLoadingUi((prev) =>
        prev
          ? {
              ...prev,
              step2: {
                phase: "done",
                line: "Lab results loaded",
              },
            }
          : prev
      );

      await sleep(Math.max(0, 1000 - (Date.now() - startTime)));
      setLoadingUi((prev) =>
        prev
          ? {
              ...prev,
              step3: {
                phase: "spin",
                line: "Checking nearby sewage overflows...",
              },
            }
          : prev
      );

      const finalData = await dataPromise;

      await sleep(Math.max(0, 1400 - (Date.now() - startTime)));

      if (fetchError) {
        setLoadingUi(null);
        setLoading(false);
        setAwaitingHouseSelection(false);
        setError(fetchError);
        return;
      }
      if (!finalData || finalData.error) {
        setLoadingUi(null);
        setLoading(false);
        setAwaitingHouseSelection(false);
        setError(finalData?.error || "Search failed. Please try again.");
        return;
      }

      setLoadingUi((prev) =>
        prev
          ? {
              ...prev,
              step3: {
                phase: "done",
                line: step3CompleteLine(finalData),
              },
            }
          : prev
      );

      pendingSuccessRef.current = {
        data: finalData,
        searchValue,
      };
      setAwaitingHouseSelection(true);
      /* Pause until user picks a house-age option; see handleHouseAgeConfirm */
    } catch {
      setLoadingUi(null);
      setLoading(false);
      setAwaitingHouseSelection(false);
      pendingSuccessRef.current = null;
      setError("Search failed. Please try again.");
    }
  }

  function handleHouseAgeConfirm(value: HomeBuiltValue) {
    const pending = pendingSuccessRef.current;
    if (!pending) return;

    pendingSuccessRef.current = null;
    setAwaitingHouseSelection(false);
    setHomeBuilt(value);

    setLoadingUi((prev) => (prev ? { ...prev, fading: true } : prev));

    window.setTimeout(() => {
      setLoadingUi(null);
      setLoading(false);
      setResult({ data: pending.data, searchValue: pending.searchValue });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      });
    }, 300);
  }

  function handleSearch(postcodeOverride?: string) {
    void runSearch(postcodeOverride);
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
    ? (() => {
        const geoForHardness = {
          adminCounty: result.data.adminCounty ?? null,
          adminDistrict: result.data.adminDistrict ?? null,
          country: result.data.country ?? null,
          region: result.data.region ?? null,
        };
        const hardnessEst =
          result.data.chemicals.hardness == null
            ? getEstimatedHardnessFromGeo(geoForHardness)
            : null;
        const regionLabel = displayRegionName(geoForHardness);
        return {
          nitrates: result.data.chemicals.nitrates,
          lead: result.data.chemicals.lead,
          chlorine: result.data.chemicals.chlorine,
          fluoride: result.data.chemicals.fluoride,
          hardness:
            result.data.chemicals.hardness ?? hardnessEst?.mgPerLitre ?? null,
          hardnessEstimate: hardnessEst
            ? { regionLabel, category: hardnessEst.category }
            : null,
          hasLocalSamples: result.data.hasLocalSamples,
          supplier: result.data.supplier,
          zoneName: result.data.zoneName,
          propertyValueImpact: hasLeadRisk ? "high" : "low",
          familyHealthScore: familyWarning ? "review" : "good",
          sewageSpills: result.data.sewageSpills,
        };
      })()
    : null;

  const showHeroForm = !loading;

  return (
    <>
      <section className="px-4 pt-12 pb-10 sm:pt-16 sm:pb-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-center text-3xl font-bold tracking-tight text-[#0f2942] sm:text-4xl">
            What&apos;s actually in your tap water?
          </h1>
          <p className="mt-3 text-center text-base text-[#1e293b]/80 sm:text-lg">
            Latest available lab data for every UK postcode
          </p>

          {loading && loadingUi && (
            <div
              ref={loadingPanelRef}
              className={`mt-8 rounded-2xl bg-[#0f2942] px-5 py-8 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] transition-opacity duration-300 md:px-8 ${
                loadingUi.fading ? "opacity-0" : "opacity-100"
              }`}
              aria-live="polite"
              aria-busy="true"
            >
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/60">
                Working on your report
              </p>
              <div className="space-y-1">
                <StepRow phase={loadingUi.step1.phase} line={loadingUi.step1.line} />
                <StepRow phase={loadingUi.step2.phase} line={loadingUi.step2.line} />
                <StepRow phase={loadingUi.step3.phase} line={loadingUi.step3.line} />
              </div>
              {loadingUi.step3.phase === "done" &&
                awaitingHouseSelection &&
                !loadingUi.fading && (
                  <LoadingPanelHouseAge
                    selectedValue={homeBuilt}
                    onConfirm={handleHouseAgeConfirm}
                  />
                )}
            </div>
          )}

          {showHeroForm && (
            <>
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
                  Search
                </button>
              </form>

              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Link
                  href="/water-quality"
                  className="group rounded-2xl border border-[#e2e8f0] border-l-4 border-l-transparent bg-white p-5 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] transition-all hover:border-l-[#0891b2] hover:shadow-md"
                >
                  <h2 className="text-base font-semibold text-[#0f2942] group-hover:text-[#0891b2]">
                    Tap water quality by town
                  </h2>
                  <p className="mt-1 text-sm text-[#64748b]">
                    DWI lab results for nitrates, lead, chlorine and fluoride — browse all
                    towns.
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[#0891b2]">Browse towns →</p>
                </Link>
                <Link
                  href="/sewage-spills"
                  className="group rounded-2xl border border-[#e2e8f0] border-l-4 border-l-transparent bg-white p-5 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] transition-all hover:border-l-[#0891b2] hover:shadow-md"
                >
                  <h2 className="text-base font-semibold text-[#0f2942] group-hover:text-[#0891b2]">
                    Sewage spills by town
                  </h2>
                  <p className="mt-1 text-sm text-[#64748b]">
                    Environment Agency storm overflow counts and durations by town.
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[#0891b2]">Browse towns →</p>
                </Link>
              </div>
            </>
          )}

          {showHeroForm && error && (
            <div className="mt-4 rounded-lg border border-[#dc2626]/30 bg-[#dc2626]/10 p-4 text-[#dc2626]">
              {error}
            </div>
          )}
        </div>
      </section>

      <div ref={resultsRef}>
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
                <div className="mt-6">
                  <WaterScorecard data={scorecardData} />
                  {hasLeadRisk && (
                    <div className="mt-6 rounded-lg border border-[#d97706]/30 bg-[#d97706]/5 p-4">
                      <p className="font-semibold text-[#d97706]">Lead pipe warning</p>
                      <p className="mt-1 text-sm text-[#1e293b]">
                        Homes built before 1970 often have lead pipes or lead solder in
                        plumbing. Lead can leach into drinking water and pose health risks,
                        especially for children. Consider having your water tested and
                        replacing lead pipes.
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
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>

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
              <p className="mt-1 text-sm font-medium text-[#0f2942]">zones mapped</p>
            </div>
            <div className="text-center">
              <p className="font-bold tabular-nums text-3xl text-[#0891b2] sm:text-4xl">
                DWI
              </p>
              <p className="mt-1 text-sm font-medium text-[#0f2942]">real lab data</p>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-[#64748b]">
            Data sourced from the Drinking Water Inspectorate via the Stream open data
            initiative
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <a
              href="/blog/tap-water-nitrates-baby-uk"
              className="block rounded-lg border border-[#0f2942]/10 bg-white p-6 transition hover:border-[#0891b2]/30 hover:shadow-md"
            >
              <p className="font-semibold text-[#0f2942]">New baby at home?</p>
              <p className="mt-2 text-sm text-[#64748b]">
                Nitrates, lead and formula — what parents need to know
              </p>
              <p className="mt-3 text-sm font-medium text-[#0891b2]">Parents hub →</p>
            </a>
            <a
              href="/blog/hard-water-eczema-uk"
              className="block rounded-lg border border-[#0f2942]/10 bg-white p-6 transition hover:border-[#0891b2]/30 hover:shadow-md"
            >
              <p className="font-semibold text-[#0f2942]">Dry skin or eczema?</p>
              <p className="mt-2 text-sm text-[#64748b]">
                Hard water and skin — the evidence
              </p>
              <p className="mt-3 text-sm font-medium text-[#0891b2]">Skin & health hub →</p>
            </a>
            <a
              href="/blog/water-quality-home-buying"
              className="block rounded-lg border border-[#0f2942]/10 bg-white p-6 transition hover:border-[#0891b2]/30 hover:shadow-md"
            >
              <p className="font-semibold text-[#0f2942]">Just bought a house?</p>
              <p className="mt-2 text-sm text-[#64748b]">
                What to check before you exchange
              </p>
              <p className="mt-3 text-sm font-medium text-[#0891b2]">Homebuyers hub →</p>
            </a>
          </div>
        </div>
      </section>

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
                      defaultValue={
                        !homeBuilt || homeBuilt === "not-sure"
                          ? ""
                          : homeBuilt
                      }
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
