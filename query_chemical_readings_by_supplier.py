#!/usr/bin/env python3
"""Query Supabase: chemical_readings count per supplier.
Tables: chemical_readings (zone_id, chemical, value_raw, unit), water_zones (zone_id, zone_name, supplier).
chemical_readings links to water_zones via zone_id.
"""
import json
import urllib.request

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjA3NTIsImV4cCI6MjA4MDY5Njc1Mn0.apqyKmh97veDquQDVxQg5IuFUDeNLwBlgml6s7kYyxs"

def fetch_all(path, select=None):
    """Fetch all rows from a Supabase table with pagination."""
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

def main():
    print("=== Supabase schema check ===\n")

    # 1. Inspect chemical_readings table structure (sample one row)
    print("1. chemical_readings columns (sample row):")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/chemical_readings?limit=1&select=*",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"},
    )
    with urllib.request.urlopen(req) as r:
        sample = json.loads(r.read())
    if sample:
        print(("   ", list(sample[0].keys())))
    else:
        print("   (table empty or no access)")

    # 2. Inspect water_zones table structure
    print("\n2. water_zones columns (sample row):")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/water_zones?limit=1&select=*",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"},
    )
    with urllib.request.urlopen(req) as r:
        sample = json.loads(r.read())
    if sample:
        print("   ", list(sample[0].keys()))
    else:
        print("   (table empty or no access)")

    # 3. Fetch water_zones: zone_id -> supplier
    print("\n3. Fetching water_zones (zone_id, supplier)...")
    zones = fetch_all("water_zones", "zone_id,supplier")
    zone_to_supplier = {z["zone_id"]: z["supplier"] for z in zones}
    print(f"   {len(zones)} water_zones rows")

    # 4. Fetch chemical_readings: zone_id, count per zone
    print("\n4. Fetching chemical_readings (zone_id)...")
    all_rows = fetch_all("chemical_readings", "zone_id")
    print(f"   {len(all_rows)} chemical_readings rows")

    # 5. Count per supplier
    supplier_counts = {}
    for row in all_rows:
        zone_id = row.get("zone_id")
        supplier = zone_to_supplier.get(zone_id)
        if supplier is None:
            supplier = "(unknown zone)"
        supplier_counts[supplier] = supplier_counts.get(supplier, 0) + 1

    print("\n=== Chemical readings count per supplier ===\n")
    for supplier in sorted(supplier_counts.keys()):
        print(f"  {supplier}: {supplier_counts[supplier]:,}")

    # 6. Check target suppliers
    target = [
        "Wessex Water",
        "Yorkshire Water",
        "United Utilities",
        "Northumbrian Water",
        "South West Water",
        "Welsh Water",
    ]
    print("\n=== Target suppliers (done = has chemical data) ===\n")
    for s in target:
        count = supplier_counts.get(s, 0)
        status = "✓ DONE" if count > 0 else "✗ not uploaded"
        print(f"  {s}: {count:,} rows — {status}")

if __name__ == "__main__":
    main()
