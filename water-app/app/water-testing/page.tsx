import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { getTestingLocalitiesByArea } from "@/lib/water-testing-localities";

const title = "Water Testing UK — Costs, Free Options and UKAS Labs";
const description =
  "How to get your tap or private water supply tested in the UK. What your water company must test for free, when a paid UKAS lab test is worth it, and typical costs.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${getSiteUrl()}/water-testing` },
  openGraph: { title, description, type: "website" },
};

export default function WaterTestingHubPage() {
  const groups = getTestingLocalitiesByArea();

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-8">
      <nav className="mb-6 text-sm text-[#64748b]" aria-label="Breadcrumb">
        <Link href="/" className="text-[#0891b2] hover:underline">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#1e293b]">Water testing</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0f2942] md:text-4xl">
          Water testing in the UK
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[#1e293b] md:text-xl">
          Most households on the mains do not need to pay for a water test. Your
          water company already tests the supply continuously and must investigate
          problems at your tap for free. Paid laboratory testing is for private
          supplies, suspected lead pipework, and documented results.
        </p>
      </header>

      <section className="rounded-2xl border border-[#0891b2]/30 bg-[#0891b2]/10 p-6">
        <h2 className="text-lg font-semibold text-[#0f2942]">
          The three routes to getting water tested
        </h2>
        <dl className="mt-4 space-y-4 text-sm leading-relaxed text-[#334155]">
          <div>
            <dt className="font-semibold text-[#0f2942]">
              Your water company — free
            </dt>
            <dd className="mt-1">
              For anything on the mains supply. They have a statutory duty to
              investigate quality complaints at your tap and will normally sample
              within a few days at no charge.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#0f2942]">
              Your local council — private supplies
            </dt>
            <dd className="mt-1">
              Environmental health teams risk-assess and sample private supplies
              such as boreholes and wells under the Private Water Supplies
              Regulations. Charges vary by council.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#0f2942]">
              A UKAS-accredited laboratory — paid
            </dt>
            <dd className="mt-1">
              When you need an independent, documented result: roughly £50–£120 for
              a domestic core panel, £200–£500 for a full private supply panel.
              Check the lab holds current UKAS accreditation for drinking water.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-[#0f2942]">
          Water testing by area
        </h2>
        <p className="mt-2 text-sm text-[#64748b]">
          Local guidance including your supplier, water hardness and what you can
          get tested free.
        </p>

        <div className="mt-6 space-y-8">
          {groups.map(({ area, localities }) => (
            <div key={area}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0f2942]">
                {area}
              </h3>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {localities.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={`/water-testing/${l.slug}`}
                      className="block rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] transition hover:border-[#0891b2]/40 hover:shadow-md"
                    >
                      <p className="font-semibold text-[#0f2942]">{l.name}</p>
                      <p className="mt-1 text-xs text-[#64748b]">{l.county}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)]">
        <h2 className="text-lg font-semibold text-[#0f2942]">
          Check what is already published for your postcode
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#475569]">
          Before paying for anything, see the official Drinking Water Inspectorate
          lab results for your own supply zone — nitrates, lead, chlorine, fluoride
          and hardness.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-[#0891b2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0e7490]"
        >
          Look up your postcode →
        </Link>
      </section>

      <footer className="mt-14 text-center text-xs leading-relaxed text-[#64748b]">
        Prices are indicative and vary by laboratory and test panel. Water Directory
        is not a testing laboratory and does not carry out sampling.
      </footer>
    </main>
  );
}
