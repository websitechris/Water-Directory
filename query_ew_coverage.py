#!/usr/bin/env python3
"""Query Supabase: England & Wales zone coverage (exclude Scottish, NI, Hafren Dyfrdwy)."""
import json
import urllib.request

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjA3NTIsImV4cCI6MjA4MDY5Njc1Mn0.apqyKmh97veDquQDVxQg5IuFUDeNLwBlgml6s7kYyxs"

EXCLUDE = {"Scottish Water", "Northern Ireland Water", "Hafren Dyfrdwy"}

def fetch_all(path, select=None, filters=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if select:
        url += f"?select={select}"
    if filters:
        for k, v in filters.items():
            url += f"&{k}={v}"
    all_rows = []
    start = 0
    step = 1000
    while True:
        req = urllib.request.Request(
            url,
            headers={
                "apikey": ANON_KEY,
                "Authorization": f"Bearer {ANON_KEY}",
                "Range": f"{start}-{start + step - 1}",
            },
        )
        with urllib.request.urlopen(req) as r:
            rows = json.loads(r.read())
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < step:
            break
        start += step
    return all_rows

def main():
    print("Fetching water_zones...")
    zones = fetch_all("water_zones", "zone_id,supplier")

    # Filter to England & Wales only
    ew_zones = [z for z in zones if z["supplier"] not in EXCLUDE]
    ew_zone_ids = set(z["zone_id"] for z in ew_zones)

    # Count unique zone_ids per supplier
    supplier_zones = {}
    for z in ew_zones:
        s = z["supplier"]
        if s not in supplier_zones:
            supplier_zones[s] = set()
        supplier_zones[s].add(z["zone_id"])

    supplier_counts = {s: len(zs) for s, zs in supplier_zones.items()}
    total_ew = len(ew_zone_ids)
    total_ew_lsoas = 32844
    pct = 100 * total_ew / total_ew_lsoas if total_ew_lsoas else 0

    print("\n" + "=" * 70)
    print("ENGLAND & WALES: Unique zone_ids in water_zones")
    print("(Excluded: Scottish Water, Northern Ireland Water, Hafren Dyfrdwy)")
    print("=" * 70)
    print(f"\nTotal unique zone_ids (E&W): {total_ew:,}")
    print(f"England & Wales LSOAs (approx): {total_ew_lsoas:,}")
    print(f"Coverage: {pct:.1f}%")
    print()

    print("Per supplier:")
    print(f"{'Supplier':<30} {'Unique zones':>15}")
    print("-" * 50)
    for s in sorted(supplier_counts.keys()):
        print(f"{s:<30} {supplier_counts[s]:>15,}")
    print("-" * 50)
    print(f"{'TOTAL':<30} {total_ew:>15,}")

    # Estimated LSOAs in each supplier's service area (England & Wales ~32,844 total)
    # Based on Ofwat/Water UK customer counts and geographic coverage
    LSOAS_ESTIMATE = {
        "Thames Water": 5500,
        "Severn Trent Water": 4200,
        "United Utilities": 3800,
        "Anglian Water": 3500,
        "Yorkshire Water": 3200,
        "Southern Water": 2800,
        "Welsh Water": 1900,
        "Wessex Water": 1600,
        "Northumbrian Water": 1500,
        "South West Water": 1200,
        "Cambridge Water": 444,
    }

    print("\n" + "=" * 70)
    print("COVERAGE vs ESTIMATED SERVICE AREA (LSOAs)")
    print("(Estimated LSOAs from customer counts ~700 hh/LSOA)")
    print("=" * 70)
    coverage_pct = []
    for s in sorted(supplier_counts.keys()):
        our_zones = supplier_counts[s]
        est_lsoas = LSOAS_ESTIMATE.get(s)
        if est_lsoas and est_lsoas > 0:
            cov = 100 * our_zones / est_lsoas
            coverage_pct.append((s, our_zones, est_lsoas, cov))
        else:
            coverage_pct.append((s, our_zones, None, None))

    print(f"\n{'Supplier':<28} {'Our zones':>10} {'Est LSOAs':>10} {'Coverage':>10}")
    print("-" * 62)
    for s, our, est, cov in sorted(coverage_pct, key=lambda x: (x[3] or 0), reverse=True):
        est_str = f"{est:,}" if est else "—"
        cov_str = f"{cov:.0f}%" if cov is not None else "—"
        print(f"{s:<28} {our:>10,} {est_str:>10} {cov_str:>10}")

    best = max((x for x in coverage_pct if x[3] is not None), key=lambda x: x[3])
    worst = min((x for x in coverage_pct if x[3] is not None and x[1] > 0), key=lambda x: x[3])
    print("\n" + "-" * 62)
    print(f"BEST coverage:  {best[0]} ({best[3]:.0f}%)")
    print(f"WORST coverage: {worst[0]} ({worst[3]:.0f}%)")

if __name__ == "__main__":
    main()
