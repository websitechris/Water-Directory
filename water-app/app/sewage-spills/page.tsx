import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { getTownsLive } from "@/lib/towns";

const cardClass =
  "group block rounded-2xl border border-[#e2e8f0] border-l-4 border-l-transparent bg-white p-6 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] transition-all hover:border-l-[#0891b2] hover:shadow-md";

export const metadata: Metadata = {
  title: "Sewage Spills by Town — Storm Overflow Data | Water Directory",
  description:
    "See sewage spill data for towns across England and Wales. Official Environment Agency storm overflow statistics including spill counts and discharge durations.",
  alternates: {
    canonical: `${getSiteUrl()}/sewage-spills`,
  },
  openGraph: {
    title: "Sewage Spills by Town — Storm Overflow Data | Water Directory",
    description:
      "See sewage spill data for towns across England and Wales. Official Environment Agency storm overflow statistics.",
    type: "website",
  },
};

export default function SewageSpillsHubPage() {
  const towns = getTownsLive();

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 pb-16 pt-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 text-sm text-[#64748b]" aria-label="Breadcrumb">
          <Link href="/" className="text-[#0891b2] hover:underline">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#1e293b]">Sewage spills</span>
        </nav>

        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#0f2942] md:text-4xl">
            Sewage Spills by Town
          </h1>
          <p className="mt-3 max-w-3xl text-base text-[#64748b] md:text-lg">
            Storm overflow data from the Environment Agency for towns across England
            and Wales.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {towns.map((town) => (
            <Link
              key={town.slug}
              href={`/sewage-spills/${town.slug}`}
              className={cardClass}
            >
              <h2 className="text-xl font-bold text-[#0f2942] group-hover:text-[#0891b2]">
                {town.name}
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">{town.county}</p>
              <p className="mt-4 text-sm font-semibold text-[#0891b2]">
                View spill data →
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/"
            className={`${cardClass} flex items-center justify-between gap-4`}
          >
            <div>
              <h2 className="text-lg font-semibold text-[#0f2942]">
                Check your postcode
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Look up tap water and nearby storm overflows for any UK address.
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#0891b2]">
              Go →
            </span>
          </Link>
        </div>

        <footer className="mt-14 text-center text-xs leading-relaxed text-[#64748b]">
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
      </div>
    </main>
  );
}
