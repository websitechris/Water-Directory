import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Water Directory | Water Directory",
  description:
    "Where our data comes from — DWI lab results, postcode lookup, data sources. Independent, not affiliated with water companies.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="bg-[#0f2942] px-4 py-3 text-center text-sm text-white">
        Data shown is from official DWI lab results. Always verify current
        readings with your water supplier before making health decisions.
      </div>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <Link
          href="/"
          className="mb-6 inline-block text-sm font-medium text-[#0891b2] hover:text-[#0e7490]"
        >
          ← Back to Search
        </Link>

        <article className="rounded-lg border border-[#0f2942]/10 bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#0f2942] sm:text-3xl">
            About Water Directory
          </h1>

          <div className="mt-6 rounded-lg border border-amber-400/50 bg-amber-50 px-4 py-3 text-amber-800">
            <p className="font-medium">Coming soon</p>
            <p className="mt-1 text-sm">
              We&apos;re expanding this page with full data source details and
              who built it. Check your postcode below in the meantime.
            </p>
          </div>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Where the data comes from
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Chemical readings — nitrates, lead, chlorine, fluoride, hardness
            — are from official Drinking Water Inspectorate (DWI) lab results,
            published via the Stream open data initiative. We are independent
            and not affiliated with any water company.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            How the postcode lookup works
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            We use postcodes.io to map your postcode to a supply zone (LSOA).
            Each zone has lab results from your water supplier. For Northern
            Ireland we use Open Data NI. Sewage spill data is from the
            Environment Agency EDM dataset (England and Wales only).
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Data sources
          </h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[#1e293b]">
            <li>
              <a
                href="https://www.streamwaterdata.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0891b2] hover:underline"
              >
                Stream / streamwaterdata.co.uk
              </a>{" "}
              — DWI chemical data
            </li>
            <li>
              <a
                href="https://postcodes.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0891b2] hover:underline"
              >
                postcodes.io
              </a>{" "}
              — postcode to LSOA lookup
            </li>
            <li>Environment Agency EDM — sewage spill data</li>
          </ul>

          <div className="mt-8 rounded-lg bg-[#0891b2]/10 p-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0891b2] px-6 py-3 font-semibold text-white hover:bg-[#0e7490]"
            >
              Look up your postcode →
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
