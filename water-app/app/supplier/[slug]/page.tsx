import Link from "next/link";
import { notFound } from "next/navigation";
import { WaterLookup } from "@/components/WaterLookup";
import type { Metadata } from "next";

const supplierMeta: Record<
  string,
  { name: string; region: string; zones: number }
> = {
  "southern-water": {
    name: "Southern Water",
    region: "Kent, Sussex, Hampshire, Isle of Wight",
    zones: 1496,
  },
  "anglian-water": {
    name: "Anglian Water",
    region: "East of England and East Midlands",
    zones: 2917,
  },
  "cambridge-water": {
    name: "Cambridge Water",
    region: "Cambridgeshire",
    zones: 212,
  },
  "united-utilities": {
    name: "United Utilities",
    region: "North West England",
    zones: 4503,
  },
  "severn-trent-water": {
    name: "Severn Trent Water",
    region: "Midlands and North Wales",
    zones: 4877,
  },
  "welsh-water": {
    name: "Welsh Water",
    region: "Wales and parts of England",
    zones: 1741,
  },
  "wessex-water": {
    name: "Wessex Water",
    region: "South West England",
    zones: 834,
  },
  "yorkshire-water": {
    name: "Yorkshire Water",
    region: "Yorkshire",
    zones: 2945,
  },
  "south-west-water": {
    name: "South West Water",
    region: "Devon and Cornwall",
    zones: 1243,
  },
  "northumbrian-water": {
    name: "Northumbrian Water",
    region: "North East England",
    zones: 2782,
  },
  "affinity-water": {
    name: "Affinity Water",
    region: "South East England",
    zones: 2261,
  },
  "ses-water": {
    name: "SES Water",
    region: "Surrey and Sussex",
    zones: 427,
  },
  "hafren-dyfrdwy": {
    name: "Hafren Dyfrdwy",
    region: "Mid Wales and Shropshire",
    zones: 50,
  },
  "northern-ireland-water": {
    name: "Northern Ireland Water",
    region: "Northern Ireland",
    zones: 64,
  },
  "essex-suffolk-water": {
    name: "Essex & Suffolk Water",
    region: "Essex and Suffolk",
    zones: 46,
  },
  "thames-water": {
    name: "Thames Water",
    region: "London and Thames Valley",
    zones: 119,
  },
};

export { supplierMeta };

export function generateStaticParams() {
  return Object.keys(supplierMeta).map((slug) => ({ slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = supplierMeta[slug];
  if (!meta) return { title: "Supplier | Water Directory" };
  return {
    title: `${meta.name} Water Quality 2024 | Water Directory`,
    description: `Check tap water quality for any ${meta.name} postcode. Real lab data for nitrates, lead, fluoride and chlorine across ${meta.zones} zones in ${meta.region}.`,
  };
}

export default async function SupplierPage({ params }: PageProps) {
  const { slug } = await params;
  const meta = supplierMeta[slug];
  if (!meta) notFound();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-2xl px-4 pt-8 pb-6">
        <Link
          href="/suppliers"
          className="mb-6 inline-block text-sm font-medium text-[#0891b2] hover:text-[#0e7490]"
        >
          ← All suppliers
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-[#0f2942] sm:text-4xl">
          {meta.name} Tap Water Quality Data
        </h1>
        <p className="mt-4 text-[#1e293b]">
          {meta.name} supplies water to {meta.region}. We have data for{" "}
          {meta.zones.toLocaleString()} supply zones, sourced from the Drinking
          Water Inspectorate via the Stream open data initiative.
        </p>
      </div>
      <div className="border-t border-[#0f2942]/10">
        <WaterLookup />
      </div>
    </div>
  );
}
