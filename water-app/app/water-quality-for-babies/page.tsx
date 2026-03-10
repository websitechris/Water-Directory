import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tap Water Safety for Babies & Toddlers | Water Directory",
  description:
    "Nitrates in formula, lead pipes, fluoride and filters — what parents need to know about tap water safety for babies.",
};

export default function WaterQualityForBabiesPage() {
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
            Tap Water Safety for Babies & Toddlers
          </h1>

          <div className="mt-6 rounded-lg border border-amber-400/50 bg-amber-50 px-4 py-3 text-amber-800">
            <p className="font-medium">Coming soon</p>
            <p className="mt-1 text-sm">
              We&apos;re building guides on nitrates in formula, lead pipes,
              fluoride and which filters actually work. Check your postcode
              below in the meantime.
            </p>
          </div>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Topics we&apos;ll cover
          </h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[#1e293b]">
            <li>Nitrates in formula and what the limits mean</li>
            <li>Lead pipes in older homes — what to check</li>
            <li>Fluoride and infant dental health</li>
            <li>What filters actually work (and what they don&apos;t)</li>
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
