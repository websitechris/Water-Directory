import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SewageCharts } from "@/components/SewageCharts";
import { SewageSitesTable } from "@/components/SewageSitesTable";
import { querySewageSpillsNearPoint } from "@/lib/arcgis-sewage";
import { getTownBySlug, TOWNS } from "@/lib/towns";
import type { SpillSite } from "@/types/water";

const RADIUS_M = 5000;
const EA_DATASET_URL =
  "https://environment.data.gov.uk/dataset/21e15f12-0df8-4bfc-b763-45226c16a8ac";

export const revalidate = 86400;

type PageProps = { params: Promise<{ slug: string }> };

const getTownSewage = cache(async (slug: string) => {
  const town = getTownBySlug(slug);
  if (!town) return null;
  const data = await querySewageSpillsNearPoint(town.lat, town.lng, RADIUS_M);
  return { town, ...data };
});

export function generateStaticParams() {
  return TOWNS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getTownSewage(slug);
  if (!payload) {
    return { title: "Town not found | Water Directory" };
  }
  const { town, totalSpills, totalHours, primaryYear } = payload;
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const title = `Sewage Spills in ${town.name} — ${primaryYear} Storm Overflow Data | Water Directory`;
  const description = `${town.name} had ${totalSpills.toLocaleString()} sewage spills totalling ${totalHours.toLocaleString()} hours in ${primaryYear}. See the worst overflow sites near ${town.name} from official Environment Agency data.`;

  return {
    title,
    description,
    ...(base
      ? { alternates: { canonical: `${base}/sewage-spills/${slug}` } }
      : {}),
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

/** Dominant operator by summed spill count (for header subtitle). */
function primaryWaterCompanyLine(sites: SpillSite[]): string {
  if (sites.length === 0) {
    return "No monitored overflow sites were returned within 5 km for this search.";
  }
  const map = new Map<string, number>();
  for (const s of sites) {
    const c = (s.company || "Unknown operator").trim();
    map.set(c, (map.get(c) ?? 0) + s.spills);
  }
  let best = "";
  let max = -1;
  for (const [c, v] of map) {
    if (v > max) {
      max = v;
      best = c;
    }
  }
  if (map.size === 1) {
    return `Includes overflow assets operated by ${best} within ${RADIUS_M / 1000} km of the town centre.`;
  }
  return `Includes sites operated by ${best} and other water companies within ${RADIUS_M / 1000} km of the town centre.`;
}

function BeakerIcon() {
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
        d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M4.867 19.125h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm2.25 0h.008v.008h-.008v-.008Zm2.25 0h.008v.008h-.008v-.008Zm2.25 0h.008v.008h-.008v-.008Zm2.25 0h.008v.008h-.008v-.008Zm2.25 0h.008v.008h-.008v-.008Z"
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.125-6 12.375-7.5 12.375S4.5 17.625 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="mt-0.5 h-5 w-5 shrink-0 text-[#d97706]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

export default async function SewageSpillsTownPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await getTownSewage(slug);
  if (!payload) notFound();

  const { town, sites, totalSpills, totalHours, siteCount } = payload;
  const subtitle = primaryWaterCompanyLine(sites);
  const equivalentDays =
    totalHours > 0 ? Math.round((totalHours / 24) * 10) / 10 : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
      <nav className="mb-6 text-sm text-[#64748b]" aria-label="Breadcrumb">
        <Link href="/" className="text-[#0891b2] hover:underline">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#1e293b]">Sewage spills</span>
        <span className="mx-2">/</span>
        <span className="text-[#1e293b]">{town.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0f2942] md:text-4xl">
          Sewage spills in {town.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#64748b] md:text-base">
          {subtitle}
        </p>
      </header>

      {/* Hero stat bar */}
      <section
        className="rounded-2xl bg-[#0f2942] px-5 py-8 text-white shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] md:px-10"
        aria-label="Summary statistics"
      >
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0891b2]">
              Total spills
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums md:text-5xl">
              {totalSpills.toLocaleString()}
            </p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#d97706]">
              Duration
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums md:text-5xl">
              {totalHours.toLocaleString()}
              <span className="ml-1 text-2xl font-semibold text-white/90">hrs</span>
            </p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
              Infrastructure
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums md:text-5xl">
              {siteCount.toLocaleString()}
            </p>
          </div>
        </div>
        <p className="mt-8 border-t border-white/15 pt-5 text-center text-sm text-white/75 sm:text-left">
          Based on the latest Environment Agency storm overflow data
        </p>
      </section>

      {/* Context callout — hours */}
      {siteCount > 0 && totalHours > 0 && (
        <section
          className="mt-8 rounded-2xl border border-[#e2e8f0] border-l-4 border-l-[#d97706] bg-white p-5 shadow-sm md:p-6"
          aria-labelledby="hours-callout-heading"
        >
          <div className="flex gap-3">
            <ClockIcon />
            <div>
              <h2
                id="hours-callout-heading"
                className="text-base font-semibold text-[#0f2942]"
              >
                What does {totalHours.toLocaleString()} hours mean?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#475569]">
                Combined across all {siteCount.toLocaleString()} sites in {town.name},
                that is equivalent to sewage being discharged continuously for{" "}
                <strong className="font-semibold text-[#0f2942]">
                  {equivalentDays.toLocaleString()} days
                </strong>{" "}
                non-stop into local waterways (if all reported hours ran back-to-back).
                In practice, spills are separate events spread across the year.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Charts */}
      <section className="mt-10" aria-label="Charts">
        <SewageCharts sites={sites} />
      </section>

      {/* Detailed table */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-[#0f2942]">
          Site details
        </h2>
        <p className="mb-4 text-sm text-[#64748b]">
          Counts use the EA 12–24 hour reporting method for the most recent year with
          spills, per site.{" "}
          <a
            href={EA_DATASET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#0891b2] hover:underline"
          >
            Environment Agency EDM dataset
          </a>
          .
        </p>
        {sites.length === 0 ? (
          <p className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-6 text-sm text-[#64748b]">
            No storm overflow discharge data was returned for this area. Monitors may
            not yet report for all assets, or no sites fall within the search radius.
          </p>
        ) : (
          <SewageSitesTable sites={sites} />
        )}
      </section>

      {/* Cross-links */}
      <section className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href={`/water-quality/${slug}`}
          className="flex gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] transition-shadow hover:shadow-md"
        >
          <BeakerIcon />
          <div>
            <p className="font-semibold text-[#0f2942]">
              Check {town.name} tap water quality
            </p>
            <p className="mt-1 text-sm text-[#64748b]">
              DWI lab-style readings, gauges and hardness for this area.
            </p>
          </div>
        </Link>
        <Link
          href="/"
          className="flex gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] transition-shadow hover:shadow-md"
        >
          <MapPinIcon />
          <div>
            <p className="font-semibold text-[#0f2942]">Search another area</p>
            <p className="mt-1 text-sm text-[#64748b]">
              Enter any UK postcode for water quality and nearby overflows.
            </p>
          </div>
        </Link>
      </section>

      <footer className="mt-14 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-5 text-center text-xs leading-relaxed text-[#64748b]">
        Contains public sector information licensed under the{" "}
        <a
          href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#0891b2] hover:underline"
        >
          Open Government Licence v3.0
        </a>
        . Storm overflow data from the Environment Agency Event Duration Monitoring
        programme.
      </footer>
    </main>
  );
}
