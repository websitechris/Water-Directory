import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hard Water and Eczema UK: The Evidence | Water Directory",
  description:
    "Does hard water worsen eczema? We look at the UK Biobank evidence and what it means for your skin. Check your postcode for water hardness.",
};

export default function HardWaterEczemaPage() {
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
            Hard Water and Eczema: The UK Evidence
          </h1>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Does hard water worsen eczema?
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Many people with eczema report that hard water makes their skin
            worse. The UK Biobank study and other research have looked at
            whether there is a real link between water hardness and eczema
            prevalence across the UK.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            What the research shows
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Hard water contains higher levels of calcium and magnesium. Some
            studies suggest these minerals can disrupt the skin barrier and
            increase irritation, particularly in people who already have
            eczema or sensitive skin. The evidence is not conclusive, but if
            you live in a hard water area and struggle with dry skin or
            eczema, it may be worth checking your local water hardness.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Check your postcode
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Water hardness varies significantly across the UK. Use our free
            postcode search to see the hardness level and chemical readings
            for your area — sourced from the Drinking Water Inspectorate.
          </p>

          <div className="mt-8 rounded-lg bg-[#0891b2]/10 p-6 text-center">
            <p className="font-semibold text-[#0f2942]">
              Check water quality for your postcode
            </p>
            <p className="mt-2 text-sm text-[#64748b]">
              See hardness, nitrates, lead and more — real DWI lab data
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
