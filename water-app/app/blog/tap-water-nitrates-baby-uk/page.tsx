import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nitrates in Tap Water and Babies: What UK Parents Need to Know | Water Directory",
  description:
    "Is boiled tap water safe for infant formula? Nitrates, lead and formula — what parents need to know. Check your postcode for real lab data.",
};

export default function TapWaterNitratesBabyPage() {
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
            Nitrates in Tap Water and Babies: What UK Parents Need to Know
          </h1>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Is boiled tap water safe for infant formula?
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Many parents use tap water to make up formula. The NHS and
            formula manufacturers generally say UK tap water is safe to use,
            but high nitrate levels can be a concern for babies under six
            months. Nitrates can interfere with how blood carries oxygen. The
            UK legal limit is 50 mg/L — and most areas are well below that —
            but levels vary by postcode.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            What the science says
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Boiling water does not remove nitrates; it can actually increase
            the concentration slightly. If you are concerned about nitrates in
            your area, it is worth checking. The Drinking Water Inspectorate
            publishes lab results for every supply zone across the UK, so you
            can see exactly what your water supplier reports for your postcode.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            What about lead?
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Older homes may have lead pipes. Lead is harmful to everyone, but
            especially to babies and young children. If your property was
            built before 1970, consider having your water tested. Our
            postcode search shows lead levels for your area and can help you
            decide if further testing is needed.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-[#0f2942]">
            Check your postcode
          </h2>
          <p className="mt-2 text-[#1e293b] leading-relaxed">
            Nitrate and lead levels vary by postcode. Use our free search to
            see real lab data for your area — sourced from the Drinking Water
            Inspectorate via the Stream open data initiative.
          </p>

          <div className="mt-8 rounded-lg bg-[#0891b2]/10 p-6 text-center">
            <p className="font-semibold text-[#0f2942]">
              Check water quality for your postcode
            </p>
            <p className="mt-2 text-sm text-[#64748b]">
              See nitrates, lead, fluoride and more — real DWI lab data
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
