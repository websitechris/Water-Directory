import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { TownWaterGauges } from "@/components/TownWaterGauges";
import { getTownBySlug, TOWNS } from "@/lib/towns";
import { getTownWaterData } from "@/lib/town-water";
import type { TownWaterChemicals } from "@/lib/town-water";
import {
  getEstimatedHardness,
  getHardnessEstimateExplanation,
  hardnessEstimateCategoryLabel,
} from "@/lib/hardness-estimate";
import {
  formatChemDisplay,
  getHardnessCategory,
  hardnessLabel,
  parseChemNumber,
} from "@/lib/water-chemical-format";
import { getSiteUrl } from "@/lib/site-url";
import { getTestingLocalityForTown } from "@/lib/water-testing-localities";

export const revalidate = 86400;

type PageProps = { params: Promise<{ slug: string }> };

const getTownWater = cache(async (slug: string) => {
  const town = getTownBySlug(slug);
  if (!town) return null;
  const water = await getTownWaterData(town);
  return { town, water };
});

export function generateStaticParams() {
  return TOWNS.map((t) => ({ slug: t.slug }));
}

function cleanSupplierName(s: string): string {
  return s.replace(/\(.*$/, "").trim();
}

type ResolvedHardness = {
  category: "soft" | "moderate" | "hard" | "veryhard";
  mgPerLitre: number;
  label: string;
  isEstimate: boolean;
};

/**
 * Single source of truth for hardness: lab CaCO₃ where we have it, county
 * geology as fallback. Hardness is the highest-volume search intent for these
 * pages ("is X a hard water area", "X water hardness"), so both the metadata
 * and the on-page answer line read from here.
 */
function resolveHardness(
  hardnessNum: number | null,
  county: string
): ResolvedHardness | null {
  if (hardnessNum != null) {
    const cat = getHardnessCategory(hardnessNum);
    return {
      category: cat,
      mgPerLitre: hardnessNum,
      label: hardnessLabel(cat),
      isEstimate: false,
    };
  }
  const est = getEstimatedHardness(county);
  if (!est) return null;
  return {
    category: est.category,
    mgPerLitre: est.mgPerLitre,
    label: hardnessLabel(est.category),
    isEstimate: true,
  };
}

/** "very hard (~350 mg/L CaCO₃)" — reused in meta description and FAQ answers. */
function hardnessPhrase(h: ResolvedHardness): string {
  const approx = h.isEstimate ? "~" : "";
  return `${h.label.toLowerCase()} (${approx}${Math.round(h.mgPerLitre)} mg/L CaCO₃)`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getTownWater(slug);
  if (!payload) {
    return { title: "Town not found | Water Directory" };
  }
  const { town, water } = payload;
  const base = getSiteUrl();
  const canonical = `${base}/water-quality/${slug}`;

  if (!water.ok) {
    const title = `${town.name} Tap Water Quality — Official DWI Lab Data`;
    const description = `Tap water quality for ${town.name}. ${water.message}`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, type: "article" },
    };
  }

  const sup = cleanSupplierName(water.supplier);
  const hard = resolveHardness(water.chemicals.hardness, town.county);
  const nitrates = formatChemDisplay(water.chemicals.nitrates);

  // Lead with hardness + safety: these are the two query clusters that carry
  // the traffic. "| Water Directory" is dropped — Google appends the site name
  // itself and the characters are better spent on the answer.
  const title = hard
    ? `${town.name} Tap Water: ${hard.label} — Is It Safe to Drink?`
    : `${town.name} Tap Water: Is It Safe to Drink? Lab Results`;

  const description = hard
    ? `${town.name} tap water is ${hardnessPhrase(hard)}, supplied by ${sup}. Nitrates ${nitrates} mg/L. Official DWI lab data, checkable by postcode.`
    : `${town.name} tap water is supplied by ${sup}. Nitrates ${nitrates} mg/L. Official DWI lab results, checkable by postcode.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

function nitratesLabelClass(n: number | null): string {
  if (n === null) return "text-white/80";
  if (n > 50) return "text-[#fca5a5]";
  if (n > 30) return "text-[#fcd34d]";
  return "text-[#0891b2]";
}

function leadLabelClass(l: number | null): string {
  if (l === null) return "text-white/80";
  if (l > 10) return "text-[#fca5a5]";
  return "text-white/90";
}

function healthContext(c: TownWaterChemicals): {
  nitrateWarn: boolean;
  leadWarn: boolean;
  allSafeTeal: boolean;
} {
  const n = parseChemNumber(c.nitrates);
  const l = parseChemNumber(c.lead);
  const f = parseChemNumber(c.fluoride);
  const cl = parseChemNumber(c.chlorine);

  const nitrateWarn = n !== null && n > 30;
  const leadWarn = l !== null && l > 5;

  // Chlorine is deliberately excluded from the legality test. The Water Supply
  // (Water Quality) Regulations 2016 set no PCV for free chlorine — it is
  // controlled for taste and odour, and residual chlorine is *required* through
  // the network. Treating 0.5 mg/L as a limit wrongly suppressed the "within
  // safe limits" panel for any zone dosing normally (e.g. Newcastle at 0.63).
  const legal =
    (n === null || n <= 50) &&
    (l === null || l <= 10) &&
    (f === null || f <= 1.5);

  const hasChemReadings = n !== null || l !== null || f !== null || cl !== null;

  const allSafeTeal =
    hasChemReadings && !nitrateWarn && !leadWarn && legal;

  return { nitrateWarn, leadWarn, allSafeTeal };
}

function DropletIcon() {
  return (
    <svg
      className="h-8 w-8 shrink-0 text-[#0891b2]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5c-3.5 4.5-6 7.8-6 11a6 6 0 1 0 12 0c0-3.2-2.5-6.5-6-11Z"
      />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg
      className="h-8 w-8 shrink-0 text-[#0891b2]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M14.25 3.104v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5M8.25 3h7.5M5 14.5h14a2 2 0 0 1 1.75 2.97l-.5.9A3 3 0 0 1 17.63 21H6.37a3 3 0 0 1-2.62-1.63l-.5-.9A2 2 0 0 1 5 14.5Z"
      />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      className="h-8 w-8 shrink-0 text-[#0891b2]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.125-6 12.375-7.5 12.375S4.5 17.625 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  );
}

/**
 * UK prescribed concentration values (PCVs), Water Supply (Water Quality)
 * Regulations 2016. Chlorine deliberately has no PCV — it is controlled for
 * taste and odour rather than a statutory ceiling, so it is described rather
 * than scored.
 */
const READING_NOTES = [
  {
    key: "nitrates" as const,
    name: "Nitrates",
    unit: "mg/L",
    limit: "50 mg/L",
    what: "Nitrates come mainly from agricultural fertiliser and sewage reaching groundwater. Healthy adults process them without difficulty; the limit exists principally to protect bottle-fed infants under six months.",
  },
  {
    key: "lead" as const,
    name: "Lead",
    unit: "µg/L",
    limit: "10 µg/L",
    what: "Water leaves the treatment works lead-free. Any lead is picked up from the pipework between the main and your tap, so the reading depends heavily on your own property — pre-1970 homes are the ones worth checking.",
  },
  {
    key: "fluoride" as const,
    name: "Fluoride",
    unit: "mg/L",
    limit: "1.5 mg/L",
    what: "Occurs naturally in some groundwater and is deliberately added in a minority of UK supply areas. Around 10% of England receives a fluoridated supply.",
  },
  {
    key: "chlorine" as const,
    name: "Chlorine",
    unit: "mg/L",
    limit: "no statutory limit",
    what: "Added as a disinfectant and required to remain present through the network to keep water safe in transit. Typically 0.2–0.5 mg/L at the tap. A noticeable taste is usually harmless and fades if water stands in a covered jug.",
  },
];

type FaqEntry = { q: string; a: string };

/**
 * FAQPage JSON-LD generated from live data. Targets the question queries these
 * pages already rank ~7 for but win no clicks on: "is X tap water safe to
 * drink", "is X hard or soft water", "who supplies X water".
 */
function buildTownFaq(args: {
  townName: string;
  supplier: string;
  hardness: ResolvedHardness | null;
  chemicals: TownWaterChemicals;
  allSafe: boolean;
  nitrateWarn: boolean;
}): FaqEntry[] {
  const { townName, supplier, hardness, chemicals, allSafe, nitrateWarn } = args;
  const faq: FaqEntry[] = [];

  const nitrates = formatChemDisplay(chemicals.nitrates);
  const lead = formatChemDisplay(chemicals.lead);

  faq.push({
    q: `Is ${townName} tap water safe to drink?`,
    a: allSafe
      ? `Yes. ${townName} tap water is supplied by ${supplier} and every parameter we hold — nitrates ${nitrates} mg/L, lead ${lead} µg/L — falls within UK drinking water standards set by the Drinking Water Inspectorate. Readings vary by supply zone, so check your exact postcode for local results.`
      : `${townName} tap water is supplied by ${supplier} and is treated to UK drinking water standards. Our latest DWI figures show nitrates at ${nitrates} mg/L and lead at ${lead} µg/L${nitrateWarn ? ", with nitrates elevated enough to be worth noting if you are preparing infant formula" : ""}. Readings vary by supply zone, so check your exact postcode.`,
  });

  if (hardness) {
    const softOrHard =
      hardness.category === "soft" || hardness.category === "moderate"
        ? "soft"
        : "hard";
    faq.push({
      q: `Is ${townName} hard or soft water?`,
      a: `${townName} has ${softOrHard} water. It measures ${hardnessPhrase(hardness)}, which is classed as ${hardness.label.toLowerCase()} on the UK scale.${hardness.isEstimate ? " This is estimated from local geology where lab CaCO₃ data for the supply zone is not yet published." : ""}`,
    });

    faq.push({
      q: `What is the water hardness in ${townName}?`,
      a: `Water hardness in ${townName} is ${hardnessPhrase(hardness)} — ${hardness.label.toLowerCase()}.${
        hardness.mgPerLitre > 200
          ? " Above roughly 200 mg/L you can expect limescale in kettles and appliances, and some people find hard water aggravates dry skin."
          : " At this level limescale is not usually a problem."
      }`,
    });
  }

  faq.push({
    q: `Who supplies the tap water in ${townName}?`,
    a: `Tap water in ${townName} is supplied by ${supplier}. They are responsible for treatment, distribution and the laboratory testing reported to the Drinking Water Inspectorate.`,
  });

  return faq;
}

export default async function TownWaterQualityPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await getTownWater(slug);
  if (!payload) notFound();

  const { town, water } = payload;

  if (!water.ok) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <nav className="mb-6 text-sm text-[#64748b]" aria-label="Breadcrumb">
          <Link href="/" className="text-[#0891b2] hover:underline">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/water-quality" className="text-[#0891b2] hover:underline">
            Water quality
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#1e293b]">{town.name}</span>
        </nav>
        <h1 className="text-3xl font-bold text-[#0f2942] md:text-4xl">
          Tap water quality in {town.name}
        </h1>
        <p className="mt-6 max-w-2xl rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-6 text-[#475569]">
          {water.message}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={`/?postcode=${encodeURIComponent(town.postcode)}`}
            className="rounded-xl bg-[#0891b2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e7490]"
          >
            Try postcode {town.postcode}
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-sm font-semibold text-[#0f2942] hover:bg-[#f8fafc]"
          >
            Home
          </Link>
        </div>
        <footer className="mt-14 text-center text-xs text-[#64748b]">
          Water quality data from the Drinking Water Inspectorate via licensed water
          company laboratory testing.
        </footer>
      </main>
    );
  }

  const { chemicals, supplier, zoneName, hasLocalSamples } = water;
  const displaySupplier = cleanSupplierName(supplier);
  const nn = parseChemNumber(chemicals.nitrates);
  const ln = parseChemNumber(chemicals.lead);
  const { nitrateWarn, leadWarn, allSafeTeal } = healthContext(chemicals);
  const hardnessNum = chemicals.hardness;
  const hardnessCat = hardnessNum != null ? getHardnessCategory(hardnessNum) : null;
  const hardnessGeoEstimate =
    hardnessNum == null ? getEstimatedHardness(town.county) : null;

  const resolvedHardness = resolveHardness(hardnessNum, town.county);
  const testingLocality = getTestingLocalityForTown(slug);
  const faq = buildTownFaq({
    townName: town.name,
    supplier: displaySupplier,
    hardness: resolvedHardness,
    chemicals,
    allSafe: allSafeTeal,
    nitrateWarn,
  });

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <nav className="mb-6 text-sm text-[#64748b]" aria-label="Breadcrumb">
        <Link href="/" className="text-[#0891b2] hover:underline">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/water-quality" className="text-[#0891b2] hover:underline">
          Water quality
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#1e293b]">{town.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0f2942] md:text-4xl">
          Tap water quality in {town.name}
        </h1>

        {/* Direct-answer line. Plain sentence, matches the query wording, and
            gives Google something liftable for the featured snippet. */}
        {resolvedHardness && (
          <p className="mt-4 text-lg font-medium leading-relaxed text-[#1e293b] md:text-xl">
            {town.name} has{" "}
            <strong className="font-semibold">
              {resolvedHardness.label.toLowerCase()} water
            </strong>{" "}
            ({resolvedHardness.isEstimate ? "~" : ""}
            {Math.round(resolvedHardness.mgPerLitre)} mg/L CaCO₃)
            {allSafeTeal
              ? ", and all tested parameters are within UK drinking water limits."
              : ", supplied and treated to UK drinking water standards."}
          </p>
        )}

        <p className="mt-3 text-sm text-[#64748b] md:text-base">
          Supplied by <span className="font-semibold text-[#0f2942]">{displaySupplier}</span>
          {zoneName ? (
            <>
              {" "}
              · <span className="text-[#475569]">{zoneName}</span>
            </>
          ) : null}{" "}
          · Based on DWI laboratory analysis
          {!hasLocalSamples ? (
            <span className="block mt-1 text-xs text-[#64748b]">
              (Regional or modelled averages where zone-specific lab rows are not yet
              linked.)
            </span>
          ) : null}
        </p>
      </header>

      {/* Hero stats */}
      <section
        className="rounded-2xl bg-[#0f2942] px-5 py-8 text-white shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] md:px-10"
        aria-label="Key readings"
      >
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${nitratesLabelClass(nn)}`}>
              Nitrates
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums md:text-4xl">
              {formatChemDisplay(chemicals.nitrates)}
              <span className="ml-1 text-lg font-semibold text-white/80 md:text-2xl">mg/L</span>
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
              Chlorine
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums md:text-4xl">
              {formatChemDisplay(chemicals.chlorine)}
              <span className="ml-1 text-lg font-semibold text-white/80 md:text-2xl">mg/L</span>
            </p>
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${leadLabelClass(ln)}`}>
              Lead
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums md:text-4xl">
              {formatChemDisplay(chemicals.lead)}
              <span className="ml-1 text-lg font-semibold text-white/80 md:text-2xl">µg/L</span>
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
              Fluoride
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums md:text-4xl">
              {formatChemDisplay(chemicals.fluoride)}
              <span className="ml-1 text-lg font-semibold text-white/80 md:text-2xl">mg/L</span>
            </p>
          </div>
        </div>
      </section>

      {/* Hardness — lab-tested */}
      {hardnessNum != null && hardnessCat != null && (
        <section className="mt-8 rounded-2xl border border-[#e2e8f0] border-l-4 border-l-[#d97706] bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-base font-semibold text-[#0f2942]">Water hardness</h2>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#1e293b]">
            {hardnessNum.toFixed(0)}{" "}
            <span className="text-base font-normal text-[#64748b]">mg/L CaCO₃</span>
          </p>
          <p className="mt-1 text-sm font-medium text-[#d97706]">
            {hardnessLabel(hardnessCat)}
          </p>
          {hardnessNum > 200 && (
            <p className="mt-3 text-sm leading-relaxed text-[#475569]">
              Your area has hard water. This can affect skin conditions and cause
              limescale buildup.
            </p>
          )}
        </section>
      )}

      {/* Hardness — geology-based estimate when no lab CaCO₃ in database */}
      {hardnessNum == null && hardnessGeoEstimate != null && (
        <section
          className="mt-8 rounded-2xl border-2 border-dashed border-[#d97706]/55 bg-amber-50/50 p-5 shadow-sm md:p-6"
          aria-label="Estimated water hardness"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-[#0f2942]">Water hardness</h2>
            <span className="rounded-full bg-amber-200/90 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#92400e]">
              Estimated
            </span>
          </div>
          <p className="mt-2 text-lg font-semibold text-[#1e293b] md:text-xl">
            Estimated: {hardnessEstimateCategoryLabel(hardnessGeoEstimate.category)} (~
            {hardnessGeoEstimate.mgPerLitre} mg/L CaCO₃)
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#475569]">
            {getHardnessEstimateExplanation(town.county, hardnessGeoEstimate.category)}
          </p>
          {hardnessGeoEstimate.mgPerLitre > 200 && (
            <p className="mt-3 text-sm leading-relaxed text-[#475569]">
              Your area is likely to have hard water. This can affect skin conditions and
              cause limescale buildup.
            </p>
          )}
        </section>
      )}

      {/* Health context */}
      <section className="mt-8 space-y-4">
        {nitrateWarn && (
          <div className="rounded-2xl border border-[#fcd34d]/60 bg-amber-50/90 p-5 text-sm text-[#78350f] shadow-sm">
            <p className="font-semibold text-[#92400e]">Parents: nitrate levels are elevated</p>
            <p className="mt-2 leading-relaxed">
              Consider a filter rated for nitrates when preparing infant formula, and follow
              NHS guidance on boiling water.
            </p>
          </div>
        )}
        {leadWarn && (
          <div className="rounded-2xl border border-[#fcd34d]/60 bg-amber-50/90 p-5 text-sm text-[#78350f] shadow-sm">
            <p className="font-semibold text-[#92400e]">Lead levels detected</p>
            <p className="mt-2 leading-relaxed">
              Homes built before 1970 may have lead pipes or fittings. If you are concerned,
              your water company can advise on sampling.
            </p>
          </div>
        )}
        {allSafeTeal && !nitrateWarn && !leadWarn && (
          <div className="rounded-2xl border border-[#0891b2]/30 bg-[#0891b2]/10 p-5 text-sm text-[#0f2942] shadow-sm">
            <p className="font-semibold text-[#0891b2]">All tested parameters are within safe drinking water limits</p>
            <p className="mt-2 leading-relaxed text-[#334155]">
              For the analytes shown, reported values are within UK drinking water standards.
              This does not replace your supplier&apos;s formal water quality report.
            </p>
          </div>
        )}
      </section>

      {/* Gauges */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-[#0f2942]">
          How readings compare to limits
        </h2>
        <TownWaterGauges chemicals={chemicals} />
      </section>

      {/* What the readings mean */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-[#0f2942]">
          What these readings mean
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#475569]">
          UK drinking water is regulated under the Water Supply (Water Quality)
          Regulations 2016, which set a prescribed concentration value (PCV) for
          each substance. {displaySupplier} must sample against these and report
          the results to the Drinking Water Inspectorate.
        </p>
        <div className="mt-6 divide-y divide-[#e2e8f0] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)]">
          {READING_NOTES.map((r) => (
            <div key={r.key} className="p-5 md:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-base font-semibold text-[#0f2942]">
                  {r.name} in {town.name}
                </h3>
                <p className="text-sm tabular-nums text-[#475569]">
                  <span className="font-semibold text-[#0f2942]">
                    {formatChemDisplay(chemicals[r.key])} {r.unit}
                  </span>
                  <span className="mx-2 text-[#cbd5e1]">·</span>
                  UK limit {r.limit}
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#475569]">{r.what}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hard water — practical, only where it is actually relevant */}
      {resolvedHardness && resolvedHardness.mgPerLitre > 200 && (
        <section className="mt-10 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] md:p-8">
          <h2 className="text-xl font-semibold text-[#0f2942]">
            Living with hard water in {town.name}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#475569]">
            At {resolvedHardness.isEstimate ? "around " : ""}
            {Math.round(resolvedHardness.mgPerLitre)} mg/L CaCO₃, {town.name} sits
            firmly in the hard water band. Hardness is dissolved calcium and
            magnesium picked up as water passes through chalk and limestone. It is
            not a health risk — the minerals are the same ones found in food — but
            it has practical consequences.
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[#475569]">
            <li>
              <strong className="font-semibold text-[#0f2942]">Limescale.</strong>{" "}
              Kettles, showerheads and heating elements scale up faster. Descaling
              every few months keeps appliances efficient.
            </li>
            <li>
              <strong className="font-semibold text-[#0f2942]">Skin.</strong> Some
              people with eczema find hard water aggravates symptoms, though the
              evidence on softeners as a treatment is mixed rather than settled.
            </li>
            <li>
              <strong className="font-semibold text-[#0f2942]">
                Soap and detergent.
              </strong>{" "}
              Hard water needs more of both to lather, which is why dishwasher salt
              exists.
            </li>
          </ul>
          <Link
            href="/blog/hard-water-eczema-uk"
            className="mt-4 inline-block text-sm font-semibold text-[#0891b2] hover:underline"
          >
            Hard water and skin — what the research says →
          </Link>
        </section>
      )}

      {/* FAQ — must stay visible on the page: Google only honours FAQPage
          schema when the same Q&A text is rendered for users. */}
      <section className="mt-12" aria-label="Frequently asked questions">
        <h2 className="mb-4 text-lg font-semibold text-[#0f2942]">
          Common questions about {town.name} tap water
        </h2>
        <div className="divide-y divide-[#e2e8f0] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)]">
          {faq.map((f) => (
            <div key={f.q} className="p-5 md:p-6">
              <h3 className="text-base font-semibold text-[#0f2942]">{f.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#475569]">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cross-links */}
      <section
        className={`mt-12 grid grid-cols-1 gap-4 ${
          testingLocality ? "md:grid-cols-3" : "md:grid-cols-2"
        }`}
      >
        {testingLocality && (
          <Link
            href={`/water-testing/${testingLocality.slug}`}
            className="flex gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] transition-shadow hover:shadow-md"
          >
            <FlaskIcon />
            <div>
              <p className="font-semibold text-[#0f2942]">
                Water testing in {testingLocality.name}
              </p>
              <p className="mt-1 text-sm text-[#64748b]">
                What {displaySupplier} tests free, and when a paid lab test is
                worth it.
              </p>
            </div>
          </Link>
        )}
        <Link
          href={`/sewage-spills/${slug}`}
          className="flex gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] transition-shadow hover:shadow-md"
        >
          <DropletIcon />
          <div>
            <p className="font-semibold text-[#0f2942]">Sewage spills in {town.name}</p>
            <p className="mt-1 text-sm text-[#64748b]">
              Official Environment Agency storm overflow data near the town centre.
            </p>
          </div>
        </Link>
        <Link
          href="/"
          className="flex gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] transition-shadow hover:shadow-md"
        >
          <MapPinIcon />
          <div>
            <p className="font-semibold text-[#0f2942]">Check your postcode</p>
            <p className="mt-1 text-sm text-[#64748b]">
              Look up any UK address for lab results and nearby overflows.
            </p>
          </div>
        </Link>
      </section>

      <footer className="mt-14 text-center text-xs leading-relaxed text-[#64748b]">
        Water quality data from the Drinking Water Inspectorate via licensed water
        company laboratory testing.
      </footer>
    </main>
  );
}
