import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sewage Spills Near Me UK: Check Your Postcode | Water Directory",
  description:
    "Find storm overflow and sewage spill data for your area. Environment Agency EDM data for England and Wales. Check your postcode for nearby spills.",
};

export default function SewageSpillsNearMePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <Link
          href="/"
          className="mb-6 inline-block text-sm font-medium text-[#0891b2] hover:text-[#0e7490]"
        >
          ← Back to Search
        </Link>

        <article className="rounded-lg border border-[#0f2942]/10 bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#0f2942] sm:text-3xl">
            Sewage Spills Near Me: How to Check Your Area
          </h1>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            What are storm overflow spills?
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Storm overflows are designed to release diluted sewage into rivers
            and the sea during heavy rainfall to prevent flooding. When they
            operate too often or for too long, they can harm water quality and
            wildlife. Water companies in England and Wales must report spill
            counts and duration to the Environment Agency.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Where does the data come from?
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Spill data is published by the Environment Agency via the EDM
            (Event Duration Monitoring) dataset. It covers combined sewer
            overflows and storm overflows across England and Wales. Scotland
            and Northern Ireland use different reporting systems.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Check sewage spills near your postcode
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Our postcode search shows storm overflow sites within 2 km of your
            location. For each site you can see spill count, total duration
            and the water company responsible. We combine this with drinking
            water quality data — nitrates, lead, hardness — so you get a
            full picture for your area.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            England and Wales only
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Sewage spill data in our search is from the Environment Agency
            and covers England and Wales. Scottish and Northern Ireland
            postcodes will show drinking water quality but not spill data.
          </p>

          <div className="mt-8 rounded-lg bg-[#0891b2]/10 p-6 text-center">
            <p className="font-semibold text-[#0f2942]">
              Check sewage spills and water quality for your postcode
            </p>
            <p className="mt-2 text-sm text-[#64748b]">
              Storm overflows, nitrates, lead and more — EA + DWI data
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-[#0891b2] px-6 py-3 font-semibold text-white hover:bg-[#0e7490]"
            >
              Search Your Postcode
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
