import Link from "next/link";
import { supplierMeta } from "../supplier/[slug]/page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UK Water Suppliers | Water Directory",
};

export default function SuppliersPage() {
  const slugs = Object.keys(supplierMeta);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-[#0f2942] sm:text-4xl">
          UK Water Suppliers
        </h1>
        <p className="mt-3 text-[#1e293b]/80">
          Tap water quality data for every major water company in the UK
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slugs.map((slug) => {
            const meta = supplierMeta[slug];
            return (
              <Link
                key={slug}
                href={`/supplier/${slug}`}
                className="block rounded-lg border border-[#0f2942]/10 bg-white p-6 transition hover:border-[#0891b2]/30 hover:shadow-md"
              >
                <h2 className="font-semibold text-[#0f2942]">
                  {meta.name}
                </h2>
                <p className="mt-2 text-sm text-[#64748b]">{meta.region}</p>
                <p className="mt-1 text-sm font-medium text-[#0891b2]">
                  {meta.zones.toLocaleString()} zones →
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
