import { headers } from "next/headers";
import { WaterLookup } from "@/components/WaterLookup";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const postcode =
    typeof params?.postcode === "string" ? params.postcode.trim() : null;

  if (!postcode) {
    return {
      title: "UK Tap Water Quality | Water Directory",
      description:
        "See nitrate, lead, fluoride and chlorine levels for your area. Real DWI lab data.",
    };
  }

  try {
    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") ?? "http";
    const baseUrl = `${protocol}://${host}`;
    const res = await fetch(
      `${baseUrl}/api/water?postcode=${encodeURIComponent(postcode)}&metaOnly=true`,
      { cache: "no-store" }
    );
    const data = await res.json() as { adminDistrict?: string | null; supplier?: string; error?: string };

    if (!res.ok || data.error) {
      return {
        title: "UK Tap Water Quality | Water Directory",
        description:
          "See nitrate, lead, fluoride and chlorine levels for your area. Real DWI lab data.",
      };
    }

    const city = data.adminDistrict ?? "Unknown";
    const year = "2024";
    const supplier = data.supplier ?? "Unknown";

    return {
      title: `Tap Water Quality in ${city} ${year} | Water Directory`,
      description: `See nitrate, lead, fluoride and chlorine levels for ${city}. Supplied by ${supplier}. Real DWI lab data.`,
    };
  } catch {
    return {
      title: "UK Tap Water Quality | Water Directory",
      description:
        "See nitrate, lead, fluoride and chlorine levels for your area. Real DWI lab data.",
    };
  }
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const postcode =
    typeof params?.postcode === "string" ? params.postcode.trim() : null;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <WaterLookup initialPostcode={postcode ?? undefined} />
    </div>
  );
}
