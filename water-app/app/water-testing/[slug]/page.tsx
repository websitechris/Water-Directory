import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WaterTestEnquiryForm } from "@/components/WaterTestEnquiryForm";
import {
  getTestingLocalityBySlug,
  getTestingLocalitiesLive,
  TESTING_LOCALITIES,
  type TestingLocality,
} from "@/lib/water-testing-localities";
import { getEstimatedHardness } from "@/lib/hardness-estimate";
import { hardnessLabel } from "@/lib/water-chemical-format";
import { getSiteUrl } from "@/lib/site-url";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TESTING_LOCALITIES.map((l) => ({ slug: l.slug }));
}

function hardnessFor(locality: TestingLocality) {
  const est = getEstimatedHardness(locality.county);
  if (!est) return null;
  return {
    label: hardnessLabel(est.category),
    mgPerLitre: est.mgPerLitre,
    isHard: est.mgPerLitre > 200,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locality = getTestingLocalityBySlug(slug);
  if (!locality) return { title: "Not found | Water Directory" };

  const base = getSiteUrl();
  // Kept under ~60 chars so it does not truncate in results. Longest live
  // locality name is "Newcastle upon Tyne" (19) → 59 total.
  const title = `Water Testing in ${locality.name} — Costs & Free Options`;
  const description = `How to get your tap or private supply water tested in ${locality.name}, ${locality.county}. What ${locality.supplier} must test for free, when you need a UKAS lab, and typical costs.`;

  return {
    title,
    description,
    alternates: { canonical: `${base}/water-testing/${slug}` },
    openGraph: { title, description, type: "article" },
  };
}

export default async function WaterTestingLocalityPage({ params }: PageProps) {
  const { slug } = await params;
  const locality = getTestingLocalityBySlug(slug);
  if (!locality) notFound();

  const hardness = hardnessFor(locality);
  const siblings = getTestingLocalitiesLive().filter(
    (l) => l.area === locality.area && l.slug !== locality.slug
  );

  const faq = [
    {
      q: `How much does water testing cost in ${locality.name}?`,
      a: `A basic private laboratory test for a domestic supply typically runs from around £50–£120 for a core panel covering bacteria, nitrates, lead and hardness. Fuller panels for private supplies — the ones covering metals, pesticides and microbiology to Private Water Supplies Regulations standards — usually cost £200–£500. If your issue is with mains water, ${locality.supplier} must investigate at no charge to you, so ask them before paying anyone.`,
    },
    {
      q: `Can I get my water tested for free in ${locality.name}?`,
      a: `Often, yes. If you are on the mains supply, ${locality.supplier} has a statutory duty to investigate water quality complaints at your tap. Call them, describe the problem, and they will normally sample free of charge. Free testing does not extend to private supplies such as boreholes and wells — those are your responsibility, though your local council's environmental health team also samples them.`,
    },
    {
      q: `Do I actually need a water test in ${locality.name}?`,
      a: `Most households on the mains do not. ${locality.supplier} already tests this supply continuously and reports the results to the Drinking Water Inspectorate — you can see those figures on our ${locality.name} water quality data. A private test is worth paying for if you are on a borehole or well, suspect lead pipework in a pre-1970 property, have a persistent taste, smell or discolouration your supplier cannot resolve, or need documentation as a landlord or business.`,
    },
    {
      q: `Who tests water in ${locality.name}?`,
      a: `Three routes. ${locality.supplier} for mains supply complaints, free. Your local council's environmental health team for private supplies, which they are required to risk-assess and sample. Or an independent UKAS-accredited laboratory, which you pay for and which gives you a documented result you can rely on for legal or commercial purposes. Always check a lab holds UKAS accreditation for drinking water before ordering.`,
    },
  ];

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
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <nav className="mb-6 text-sm text-[#64748b]" aria-label="Breadcrumb">
        <Link href="/" className="text-[#0891b2] hover:underline">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/water-testing" className="text-[#0891b2] hover:underline">
          Water testing
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#1e293b]">{locality.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0f2942] md:text-4xl">
          Water testing in {locality.name}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[#1e293b] md:text-xl">
          Mains water in {locality.name} is supplied by{" "}
          <strong className="font-semibold">{locality.supplier}</strong>, who must
          investigate quality complaints at your tap free of charge. Paid
          laboratory testing is worth it mainly for private supplies, suspected
          lead pipework, or documentation you need in writing.
        </p>
      </header>

      {/* Start here — the honest answer first */}
      <section className="rounded-2xl border border-[#0891b2]/30 bg-[#0891b2]/10 p-6">
        <h2 className="text-lg font-semibold text-[#0f2942]">
          Try this before you pay anyone
        </h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-[#334155]">
          <li>
            <strong className="font-semibold text-[#0f2942]">
              1. Check what is already published.
            </strong>{" "}
            {locality.supplier} tests this supply continuously and reports to the
            Drinking Water Inspectorate.{" "}
            {locality.parentTownSlug ? (
              <Link
                href={`/water-quality/${locality.parentTownSlug}`}
                className="font-medium text-[#0891b2] hover:underline"
              >
                See the lab figures for this area
              </Link>
            ) : (
              <Link href="/" className="font-medium text-[#0891b2] hover:underline">
                Look up your postcode
              </Link>
            )}
            . For most concerns this answers the question at no cost.
          </li>
          <li>
            <strong className="font-semibold text-[#0f2942]">
              2. Call {locality.supplier}.
            </strong>{" "}
            If your water tastes, smells or looks wrong, they have a legal duty to
            investigate at your tap. This is free and they will normally sample
            within a few days.
          </li>
          <li>
            <strong className="font-semibold text-[#0f2942]">
              3. Only then pay for a private test.
            </strong>{" "}
            Worth it for boreholes and wells, pre-1970 lead pipework, landlord or
            business records, or when you need a documented UKAS result.
          </li>
        </ol>
      </section>

      {/* When paid testing is genuinely warranted */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-[#0f2942]">
          When a paid test in {locality.name} is worth it
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            {
              t: "Private supply, borehole or well",
              d: "Not covered by your supplier at all. Private Water Supplies Regulations require risk assessment and periodic sampling — your council's environmental health team can advise, and will sample.",
            },
            {
              t: "Suspected lead pipework",
              d: "Properties built before 1970 may still have lead service pipes or lead-soldered joints. Mains water leaves the works lead-free; lead is picked up from your own plumbing, so only a tap sample tells you.",
            },
            {
              t: "Taste, smell or discolouration",
              d: "Report it to your supplier first. If they sample and find nothing but the problem persists, an independent test distinguishes a supply issue from a plumbing or storage tank issue.",
            },
            {
              t: "Landlord, letting or business duty",
              d: "Food businesses, holiday lets and some HMOs need documented water quality records. A UKAS-accredited certificate is what inspectors expect to see.",
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

      {/* Local water context */}
      {hardness && (
        <section className="mt-10 rounded-2xl border border-[#e2e8f0] border-l-4 border-l-[#d97706] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)]">
          <h2 className="text-xl font-semibold text-[#0f2942]">
            Water in {locality.name} is {hardness.label.toLowerCase()}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#475569]">
            Based on the geology of {locality.county}, water here is estimated at
            around {hardness.mgPerLitre} mg/L CaCO₃ —{" "}
            {hardness.label.toLowerCase()} on the UK scale.{" "}
            {hardness.isHard
              ? "If your reason for testing is limescale in kettles and appliances, hardness is almost certainly the cause, and a lab test will only confirm what the geology already tells you. A water softener is the practical fix, not a test."
              : "Limescale is unlikely to be your problem here, so if you are seeing scale or cloudiness it is worth looking at your plumbing or an internal storage tank rather than the supply."}
          </p>
          {locality.parentTownSlug && (
            <Link
              href={`/water-quality/${locality.parentTownSlug}`}
              className="mt-4 inline-block text-sm font-semibold text-[#0891b2] hover:underline"
            >
              See full lab results for this area →
            </Link>
          )}
        </section>
      )}

      {/* Enquiry */}
      <section className="mt-10 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-6 shadow-[0_4px_6px_-1px_rgba(15,41,66,0.08)] md:p-8">
        <h2 className="text-xl font-semibold text-[#0f2942]">
          Get testing options for {locality.name}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#475569]">
          Tell us what you need tested and we will email you UKAS-accredited
          laboratories covering {locality.name}, with indicative prices.
        </p>
        <div className="mt-6">
          <WaterTestEnquiryForm
            localityName={locality.name}
            interestType={`water-testing:${locality.slug}`}
          />
        </div>
      </section>

      {/* FAQ — visible, matching the JSON-LD above */}
      <section className="mt-12" aria-label="Frequently asked questions">
        <h2 className="mb-4 text-xl font-semibold text-[#0f2942]">
          Water testing in {locality.name} — common questions
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

      {siblings.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-[#0f2942]">
            Water testing nearby
          </h2>
          <ul className="flex flex-wrap gap-3">
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/water-testing/${s.slug}`}
                  className="inline-block rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-medium text-[#0f2942] hover:border-[#0891b2]/40 hover:text-[#0891b2]"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-14 text-center text-xs leading-relaxed text-[#64748b]">
        Prices are indicative and vary by laboratory and test panel. Water Directory
        is not a testing laboratory and does not carry out sampling. Always confirm
        a laboratory holds current UKAS accreditation for drinking water analysis.
      </footer>
    </main>
  );
}
