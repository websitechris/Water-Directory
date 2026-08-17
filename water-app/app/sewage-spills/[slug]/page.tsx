import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SewageCharts } from "@/components/SewageCharts";
import { SewageSitesTable } from "@/components/SewageSitesTable";
import { querySewageSpillsNearPoint } from "@/lib/arcgis-sewage";
import { getSiteUrl } from "@/lib/site-url";
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
  const { town, totalSpills, totalHours, siteCount, primaryYear } = payload;
  const base = getSiteUrl();

  // Lead with the number. "| Water Directory" dropped — Google appends the site
  // name itself and the old title ran to ~73 chars and truncated.
  const title =
    totalSpills > 0
      ? `${town.name} Sewage Spills: ${totalSpills.toLocaleString()} in ${primaryYear}`
      : `Sewage Spills in ${town.name} — Storm Overflow Data`;

  const description =
    totalSpills > 0
      ? `Storm overflows near ${town.name} discharged ${totalSpills.toLocaleString()} times in ${primaryYear}, totalling ${totalHours.toLocaleString()} hours across ${siteCount} monitored sites. Official Environment Agency data.`
      : `Storm overflow discharge data for ${town.name} from official Environment Agency monitoring. See which sites report near you.`;

  return {
    title,
    description,
    alternates: { canonical: `${base}/sewage-spills/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

/** Dominant operator name only, for prose and FAQ answers. */
function dominantOperator(sites: SpillSite[]): string {
  const map = new Map<string, number>();
  for (const s of sites) {
    const c = (s.company || "").trim();
    if (c) map.set(c, (map.get(c) ?? 0) + s.spills);
  }
  let best = "your water company";
  let max = -1;
  for (const [c, v] of map) {
    if (v > max) {
      max = v;
      best = c;
    }
  }
  return best;
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

type FaqEntry = { q: string; a: string };

/**
 * FAQ generated from live EA figures. Targets the intent behind these pages —
 * "is it safe to swim", "why do they do it", "who do I report it to" — none of
 * which the numbers alone answer.
 */
function buildSewageFaq(args: {
  townName: string;
  totalSpills: number;
  totalHours: number;
  siteCount: number;
  primaryYear: string;
  operator: string;
}): FaqEntry[] {
  const { townName, totalSpills, totalHours, siteCount, primaryYear, operator } =
    args;
  const faq: FaqEntry[] = [];

  if (totalSpills > 0) {
    faq.push({
      q: `How many sewage spills were there in ${townName}?`,
      a: `Monitored storm overflows within 5 km of ${townName} recorded ${totalSpills.toLocaleString()} discharge events in ${primaryYear}, totalling ${totalHours.toLocaleString()} hours across ${siteCount} sites. These figures come from Environment Agency Event Duration Monitoring, which water companies are required to fit to storm overflows and report annually.`,
    });
  }

  faq.push({
    q: `Why do water companies release sewage near ${townName}?`,
    a: `Much of the UK uses a combined sewer system, where rainwater and wastewater share the same pipes. During heavy rain the volume can exceed what the network and treatment works can carry. Storm overflows act as a designed relief valve, releasing diluted sewage into rivers or the sea rather than backing it up into homes and streets. The problem is that they are now used far more often than the system was intended to allow.`,
  });

  faq.push({
    q: `Is it legal to discharge sewage into rivers and the sea?`,
    a: `Storm overflows operate under environmental permits, so discharging within those permit conditions is lawful. Discharging outside them — for example in dry weather, or beyond permitted duration — is not, and is enforceable by the Environment Agency. The distinction matters: a high spill count is not by itself evidence of illegality, but it is evidence of a network under strain.`,
  });

  faq.push({
    q: `Is it safe to swim near ${townName}?`,
    a: `Storm overflow data tells you where and how often discharges happen, not the water quality on a given day. If you swim, check the Environment Agency's designated bathing water classifications for your spot, and short-term pollution alerts before entering. Risk is highest during and for around 48 hours after heavy rainfall. Surfers Against Sewage runs a free real-time alert service for many UK bathing sites.`,
  });

  faq.push({
    q: `Who do I report a sewage spill or pollution to?`,
    a: `Report pollution incidents in England to the Environment Agency's 24-hour incident hotline on 0800 80 70 60. In Wales, contact Natural Resources Wales on 0300 065 3000. You can also report the issue to ${operator} directly, and it is worth doing both so the incident is logged independently of the operator.`,
  });

  return faq;
}

export default async function SewageSpillsTownPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await getTownSewage(slug);
  if (!payload) notFound();

  const { town, sites, totalSpills, totalHours, siteCount, primaryYear } = payload;
  const subtitle = primaryWaterCompanyLine(sites);
  const equivalentDays =
    totalHours > 0 ? Math.round((totalHours / 24) * 10) / 10 : 0;
  const operator = dominantOperator(sites);

  const faq = buildSewageFaq({
    townName: town.name,
    totalSpills,
    totalHours,
    siteCount,
    primaryYear,
    operator,
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
        <Link href="/sewage-spills" className="text-[#0891b2] hover:underline">
          Sewage spills
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#1e293b]">{town.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0f2942] md:text-4xl">
          Sewage spills in {town.name}
        </h1>

        {/* Direct-answer line — plain sentence, matches the query, liftable. */}
        {totalSpills > 0 && (
          <p className="mt-4 max-w-3xl text-lg font-medium leading-relaxed text-[#1e293b] md:text-xl">
            Storm overflows near {town.name} discharged{" "}
            <strong className="font-semibold">
              {totalSpills.toLocaleString()} times
            </strong>{" "}
            in {primaryYear}, for a combined{" "}
            <strong className="font-semibold">
              {totalHours.toLocaleString()} hours
            </strong>{" "}
            across {siteCount} monitored {siteCount === 1 ? "site" : "sites"}.
          </p>
        )}

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

      {/* What the numbers actually mean */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-[#0f2942]">
          What this data does and does not tell you
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            {
              t: "It counts events, not volume",
              d: "Event Duration Monitoring records when an overflow ran and for how long. It does not measure how much was discharged, or how diluted it was. A long spill in heavy rain may be far more diluted than a short one in light rain.",
            },
            {
              t: "Coverage has improved sharply",
              d: "Monitors were fitted across almost all storm overflows in England by the end of 2023. Rising spill counts in recent years partly reflect better monitoring, not only worse performance — which is why year-on-year comparisons need care.",
            },
            {
              t: "Permitted is not the same as harmless",
              d: "Storm overflows are allowed under environmental permits. Operating within a permit makes a discharge lawful; it does not mean it has no effect on the river or coastline receiving it.",
            },
            {
              t: "This is a 5 km radius, not a boundary",
              d: `Sites shown are those within ${RADIUS_M / 1000} km of the centre of ${town.name}. Some may discharge into different watercourses, and overflows just outside the radius are not counted.`,
            },
          ].map(({ t, d }) => (
            <div
              key={t}
              className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)]"
            >
              <h3 className="font-semibold text-[#0f2942]">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#475569]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reporting — practical and actionable */}
      <section className="mt-10 rounded-2xl border border-[#0891b2]/30 bg-[#0891b2]/10 p-6">
        <h2 className="text-lg font-semibold text-[#0f2942]">
          Seen a pollution incident near {town.name}?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#334155]">
          Report it to the Environment Agency 24-hour incident hotline on{" "}
          <a
            href="tel:08008070600"
            className="font-semibold text-[#0891b2] hover:underline"
          >
            0800 80 70 60
          </a>{" "}
          (England), or Natural Resources Wales on{" "}
          <a
            href="tel:03000653000"
            className="font-semibold text-[#0891b2] hover:underline"
          >
            0300 065 3000
          </a>
          . Report it to {operator} as well — logging it in both places means the
          incident exists independently of the operator&apos;s own records. Note the
          time, location and what you saw, and photograph it if you safely can.
        </p>
      </section>

      {/* FAQ — visible text mirrors the JSON-LD above */}
      <section className="mt-12" aria-label="Frequently asked questions">
        <h2 className="mb-4 text-xl font-semibold text-[#0f2942]">
          Sewage spills in {town.name} — common questions
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
