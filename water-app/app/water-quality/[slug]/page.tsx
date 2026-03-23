import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { TownWaterGauges } from "@/components/TownWaterGauges";
import { getTownBySlug, TOWNS } from "@/lib/towns";
import { getTownWaterData } from "@/lib/town-water";
import type { TownWaterChemicals } from "@/lib/town-water";
import {
  formatChemDisplay,
  getHardnessCategory,
  hardnessLabel,
  parseChemNumber,
} from "@/lib/water-chemical-format";

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

function metaChemicalLine(c: TownWaterChemicals): string {
  const n = formatChemDisplay(c.nitrates);
  const l = formatChemDisplay(c.lead);
  return `Nitrates: ${n} mg/L, Lead: ${l} µg/L`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getTownWater(slug);
  if (!payload) {
    return { title: "Town not found | Water Directory" };
  }
  const { town, water } = payload;
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const title = `Tap Water Quality in ${town.name} — Nitrates, Lead, Chlorine | Water Directory`;

  let description: string;
  if (!water.ok) {
    description = `Tap water quality for ${town.name}. ${water.message}`;
  } else {
    const sup = cleanSupplierName(water.supplier);
    description = `${town.name} tap water is supplied by ${sup}. ${metaChemicalLine(water.chemicals)}. See full lab results from official DWI data.`;
  }

  return {
    title,
    description,
    ...(base
      ? { alternates: { canonical: `${base}/water-quality/${slug}` } }
      : {}),
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

  const legal =
    (n === null || n <= 50) &&
    (l === null || l <= 10) &&
    (f === null || f <= 1.5) &&
    (cl === null || cl <= 0.5);

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

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0f2942] md:text-4xl">
          Tap water quality in {town.name}
        </h1>
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

      {/* Hardness card */}
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

      {/* Cross-links */}
      <section className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
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
