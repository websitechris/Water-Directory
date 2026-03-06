import { WaterLookup } from "@/components/WaterLookup";

export const metadata = {
  title: "UK Water Supplier Lookup",
  description:
    "Search your UK postcode or Eircode to find your water supplier and view local water quality data.",
};

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <WaterLookup />
    </div>
  );
}
