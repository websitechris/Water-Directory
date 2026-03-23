import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { querySewageSpillsNearPoint } from "@/lib/arcgis-sewage";
import { getTownBySlug, TOWNS } from "@/lib/towns";

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

function spillCountClass(spills: number): string {
  if (spills > 100) return "text-[#dc2626]";
  if (spills > 50) return "text-[#d97706]";
  return "text-[#0f2942]";
}

export default async function SewageSpillsTownPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await getTownSewage(slug);
  if (!payload) notFound();

  const { town, sites, primaryYear, totalSpills, totalHours, siteCount } = payload;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-8">
      <nav className="mb-6 text-sm text-[#64748b]">
        <Link href="/" className="text-[#0891b2] hover:underline">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#1e293b]">Sewage spills</span>
        <span className="mx-2">/</span>
        <span className="text-[#1e293b]">{town.name}</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-[#0f2942] md:text-4xl">
        Sewage Spills in {town.name}
      </h1>
      <p className="mt-2 text-sm text-[#64748b]">
        {town.county}, England · Within {RADIUS_M / 1000} km of town centre
      </p>

      {/* Hero stat bar */}
      <section
        className="mt-8 rounded-lg bg-[#0f2942] px-4 py-8 text-white md:px-8"
        aria-label="Summary statistics"
      >
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-4">
          <div className="text-center sm:text-left">
            <p className="text-4xl font-bold tabular-nums">
              {totalSpills.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-white/85">Sewage spills</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-4xl font-bold tabular-nums">
              {totalHours.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-white/85">Hours discharged</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-4xl font-bold tabular-nums">
              {siteCount.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-white/85">Overflow sites</p>
          </div>
        </div>
        <p className="mt-6 border-t border-white/20 pt-4 text-center text-sm text-white/80 sm:text-left">
          Based on Environment Agency data for {primaryYear}
        </p>
      </section>

      {/* Worst offenders */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-[#0f2942]">
          Worst overflow sites near {town.name}
        </h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Sites ordered by spill count (most recent reporting year with spills, per
          site). Counts use the EA 12–24 hour method.
        </p>

        {sites.length === 0 ? (
          <p className="mt-6 rounded-lg border border-[#0f2942]/10 bg-[#f8fafc] p-6 text-sm text-[#64748b]">
            No storm overflow discharge data was returned for this area in the
            current dataset. This can happen where monitors were not yet reporting
            or no sites fall within the search radius.
          </p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-lg border border-[#0f2942]/10 bg-white shadow-sm">
            <ul className="divide-y divide-[#e2e8f0]">
              {sites.map((site) => (
                <li
                  key={`${site.name}-${site.year}`}
                  className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#1e293b]">{site.name}</p>
                    <p className="mt-0.5 text-xs text-[#64748b]">
                      {site.company || "Water company not listed"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-baseline gap-4 sm:justify-end sm:text-right">
                    <div>
                      <span
                        className={`text-lg font-bold tabular-nums ${spillCountClass(site.spills)}`}
                      >
                        {site.spills.toLocaleString()}
                      </span>
                      <span className="ml-1 text-xs font-normal text-[#64748b]">
                        spills
                      </span>
                    </div>
                    <div className="text-sm tabular-nums text-[#64748b]">
                      {site.hours.toLocaleString()} hrs
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Context */}
      <section className="mt-12 rounded-lg border border-[#0f2942]/10 bg-[#f8fafc] p-6">
        <h2 className="text-lg font-semibold text-[#0f2942]">What this means</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#475569]">
          Storm overflows are part of the sewerage system in England. During heavy
          rainfall, they can discharge excess diluted wastewater to reduce the risk
          of flooding homes and streets. The Environment Agency requires water
          companies to monitor many of these overflows and report how often they
          operate and for how long. The figures here are from those official annual
          returns — they describe reported discharges, not every pipe in the area.
        </p>
        <p className="mt-3 text-sm">
          <a
            href={EA_DATASET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#0891b2] hover:underline"
          >
            Event Duration Monitoring — storm overflows (Environment Agency)
          </a>
        </p>
      </section>

      {/* Cross-links */}
      <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href={`/?postcode=${encodeURIComponent(town.postcode)}`}
          className="rounded-lg border border-t border-r border-b border-[#e2e8f0] border-l-4 border-l-[#0891b2] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="font-semibold text-[#0f2942]">
            Tap water quality in {town.name}
          </p>
          <p className="mt-1 text-sm text-[#64748b]">
            Nitrates, lead and other parameters for this area.
          </p>
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-t border-r border-b border-[#e2e8f0] border-l-4 border-l-[#0891b2] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="font-semibold text-[#0f2942]">Check your postcode</p>
          <p className="mt-1 text-sm text-[#64748b]">
            Look up lab results and nearby overflows from your address.
          </p>
        </Link>
      </section>

      <footer className="mt-12 border-t border-[#e2e8f0] pt-6 text-center text-xs text-[#64748b]">
        Sewage overflow data sourced live from the Environment Agency Event
        Duration Monitoring dataset under the{" "}
        <a
          href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0891b2] hover:underline"
        >
          Open Government Licence v3
        </a>
        .
      </footer>
    </main>
  );
}
