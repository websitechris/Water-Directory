import type { Metadata } from "next";
import Link from "next/link";
import { getTownsLive } from "@/lib/towns";

const cardClass =
  "group block rounded-2xl border border-[#e2e8f0] border-l-4 border-l-transparent bg-white p-6 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] transition-all hover:border-l-[#0891b2] hover:shadow-md";

export const metadata: Metadata = {
  title: "Tap Water Quality by Town — Lab Results | Water Directory",
  description:
    "See tap water quality data for towns across the UK. Official DWI laboratory results for nitrates, chlorine, lead and fluoride.",
  ...(process.env.NEXT_PUBLIC_SITE_URL
    ? {
        alternates: {
          canonical: `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/water-quality`,
        },
      }
    : {}),
  openGraph: {
    title: "Tap Water Quality by Town — Lab Results | Water Directory",
    description:
      "See tap water quality data for towns across the UK. Official DWI laboratory results.",
    type: "website",
  },
};

export default function WaterQualityHubPage() {
  const towns = getTownsLive();

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 pb-16 pt-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 text-sm text-[#64748b]" aria-label="Breadcrumb">
          <Link href="/" className="text-[#0891b2] hover:underline">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#1e293b]">Water quality</span>
        </nav>

        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#0f2942] md:text-4xl">
            Tap Water Quality by Town
          </h1>
          <p className="mt-3 max-w-3xl text-base text-[#64748b] md:text-lg">
            DWI laboratory analysis for towns across England, Wales and Northern
            Ireland.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {towns.map((town) => (
            <Link
              key={town.slug}
              href={`/water-quality/${town.slug}`}
              className={cardClass}
            >
              <h2 className="text-xl font-bold text-[#0f2942] group-hover:text-[#0891b2]">
                {town.name}
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">{town.county}</p>
              <p className="mt-4 text-sm font-semibold text-[#0891b2]">
                View water quality →
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
                Search any UK postcode for lab results and nearby overflows.
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#0891b2]">
              Go →
            </span>
          </Link>
        </div>

        <footer className="mt-14 text-center text-xs leading-relaxed text-[#64748b]">
          Water quality data from the Drinking Water Inspectorate via licensed water
          company laboratory testing.
        </footer>
      </div>
    </main>
  );
}
