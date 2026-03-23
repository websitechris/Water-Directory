import { NextRequest, NextResponse } from "next/server";
import { querySewageSpillsNearPoint } from "@/lib/arcgis-sewage";

export const dynamic = "force-dynamic";

/**
 * EA ArcGIS EDM query proxy — do not expose ArcGIS URL to client components.
 * GET ?lat=53.96&lng=-1.08&radius=5000 (radius in metres, default 5000)
 */
export async function GET(request: NextRequest) {
  const latRaw = request.nextUrl.searchParams.get("lat");
  const lngRaw = request.nextUrl.searchParams.get("lng");
  const radiusRaw = request.nextUrl.searchParams.get("radius");

  const lat = latRaw != null ? Number(latRaw) : NaN;
  const lng = lngRaw != null ? Number(lngRaw) : NaN;
  const radius =
    radiusRaw != null ? Number(radiusRaw) : 5000;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Invalid or missing lat/lng query parameters" },
      { status: 400 }
    );
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "lat/lng out of valid range" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(radius) || radius < 100 || radius > 50000) {
    return NextResponse.json(
      { error: "radius must be a number between 100 and 50000 (metres)" },
      { status: 400 }
    );
  }

  try {
    const summary = await querySewageSpillsNearPoint(lat, lng, radius);
    return NextResponse.json({
      sites: summary.sites,
      meta: {
        lat,
        lng,
        radiusMeters: radius,
        primaryYear: summary.primaryYear,
        totalSpills: summary.totalSpills,
        totalHours: summary.totalHours,
        siteCount: summary.siteCount,
      },
    });
  } catch (e) {
    console.error("sewage-town ArcGIS error:", e);
    return NextResponse.json(
      { error: "Failed to load sewage spill data" },
      { status: 502 }
    );
  }
}
