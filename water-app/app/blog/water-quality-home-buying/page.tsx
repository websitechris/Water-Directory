import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Water Quality When Buying a House UK: What to Check | Water Directory",
  description:
    "What your CON29DW search doesn't tell you about water quality. Lead pipes, nitrates and supply zones — check any postcode before you buy.",
};

export default function WaterQualityHomeBuyingPage() {
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
            Water Quality When Buying a House: What to Check
          </h1>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            What your CON29DW search doesn&apos;t tell you
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            The CON29DW drainage and water search confirms who supplies water
            and sewerage to a property, and whether the property is connected.
            It does not include chemical readings — nitrates, lead, hardness
            or chlorine levels. For a fuller picture of water quality in the
            area you are buying, you need to look at the actual lab data for
            that postcode.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Lead pipes in UK homes
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Properties built before 1970 often have lead pipes or lead solder
            in the plumbing. Lead can leach into drinking water and pose
            health risks, especially for children. Lenders and surveyors are
            increasingly flagging lead pipes as a risk factor. Check the lead
            levels for the supply zone before you exchange — and consider a
            professional water survey if the property is pre-1970.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Hard water and your new home
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Water hardness varies by postcode. Hard water affects boilers,
            appliances and bills. Knowing the hardness level for your new
            area can help you budget for a water softener or scale
            prevention if needed.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Check any postcode before you buy
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            You can search any UK postcode — including the property you are
            considering — to see nitrates, lead, fluoride, chlorine and
            hardness. Data is sourced from the Drinking Water Inspectorate
            via the Stream open data initiative.
          </p>

          <div className="mt-8 rounded-lg bg-[#0891b2]/10 p-6 text-center">
            <p className="font-semibold text-[#0f2942]">
              Check any postcode before you buy
            </p>
            <p className="mt-2 text-sm text-[#64748b]">
              Nitrates, lead, hardness and more — real DWI lab data
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-[#0891b2] px-6 py-3 font-semibold text-white hover:bg-[#0e7490]"
            >
              Search Postcode
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
