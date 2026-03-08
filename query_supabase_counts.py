#!/usr/bin/env python3
"""Query Supabase: chemical_readings count per supplier (join water_zones) + ni_postcode_zones count."""
import json
import urllib.request

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjA3NTIsImV4cCI6MjA4MDY5Njc1Mn0.apqyKmh97veDquQDVxQg5IuFUDeNLwBlgml6s7kYyxs"

def fetch_all(path, select=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if select:
        url += f"?select={select}"
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

def get_count(path):
    """Get row count using Prefer: count=exact."""
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}?select=*",
        headers={
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {ANON_KEY}",
            "Range": "0-0",
            "Prefer": "count=exact",
        },
    )
    with urllib.request.urlopen(req) as r:
        cr = r.headers.get("Content-Range", "")
        # Format: "0-0/12345"
        if "/" in cr:
            return int(cr.split("/")[1])
    return 0

def main():
    # 1. chemical_readings count per supplier (join water_zones)
    print("Fetching water_zones...")
    zones = fetch_all("water_zones", "zone_id,supplier")
    zone_to_supplier = {z["zone_id"]: z["supplier"] for z in zones}

    print("Fetching chemical_readings...")
    chem_rows = fetch_all("chemical_readings", "zone_id")

    supplier_counts = {}
    for row in chem_rows:
        zone_id = row.get("zone_id")
        supplier = zone_to_supplier.get(zone_id, "(unknown zone)")
        supplier_counts[supplier] = supplier_counts.get(supplier, 0) + 1

    # 2. ni_postcode_zones count
    ni_count = get_count("ni_postcode_zones")

    # 3. Print as table
    print("\n" + "=" * 55)
    print("CHEMICAL_READINGS count per supplier (via water_zones join)")
    print("=" * 55)
    print(f"{'Supplier':<35} {'Count':>15}")
    print("-" * 55)
    for supplier in sorted(supplier_counts.keys()):
        print(f"{supplier:<35} {supplier_counts[supplier]:>15,}")
    print("-" * 55)
    print(f"{'TOTAL':<35} {sum(supplier_counts.values()):>15,}")
    print()

    print("=" * 55)
    print("NI_POSTCODE_ZONES")
    print("=" * 55)
    print(f"{'Table':<35} {'Count':>15}")
    print("-" * 55)
    print(f"{'ni_postcode_zones (postcodes)':<35} {ni_count:>15,}")
    print("=" * 55)

if __name__ == "__main__":
    main()
