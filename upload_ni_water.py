#!/usr/bin/env python3
"""
Upload NI Water data to Supabase.
File 1: postcode-v-zone-lookup-by-year.csv -> water_zones (unique 2024 zone codes)
File 2: 2024-ni-water-customer-tap-supply-point-results.csv -> chemical_readings
Site Code = zone_id when Site Code is in zone list (ZN*, ZS*). W* codes are treatment works - skipped.
"""
import csv
import json
import urllib.request
import urllib.error
from collections import defaultdict

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

def supabase_get(path):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={"apikey": SERVICE_ROLE_KEY, "Authorization": f"Bearer {SERVICE_ROLE_KEY}"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def supabase_post(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        data=body,
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal,resolution=ignore-duplicates",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode()[:500]}")
        return e.code

# ── Step 1: X-ray CSVs ───────────────────────────────────────────────────────
print("=== Step 1: X-ray CSVs ===\n")

# File 2: unique Parameters
params = set()
with open("2024-ni-water-customer-tap-supply-point-results.csv", encoding="utf-8-sig") as f:
    r = csv.DictReader(f)
    for row in r:
        params.add(row.get("Parameter", "").strip())
print("File 2 unique Parameter values:")
for p in sorted(params):
    print(f"  {p}")
print()

# File 1: sample 5 rows
with open("postcode-v-zone-lookup-by-year.csv", encoding="utf-8-sig") as f:
    r = csv.DictReader(f)
    rows = list(r)
print("File 1 sample 5 rows:")
for i, row in enumerate(rows[:5]):
    print(f"  {dict(row)}")
print()

# ── Step 2: Extract zones from file 1 ──────────────────────────────────────────
print("=== Step 2: Upload water_zones ===\n")
zones_2024 = set()
with open("postcode-v-zone-lookup-by-year.csv", encoding="utf-8-sig") as f:
    r = csv.DictReader(f)
    for row in r:
        z = row.get("2024", "").strip()
        if z and z != "No Zone Identified":
            zones_2024.add(z)

print(f"  {len(zones_2024)} unique 2024 zone codes")

existing_raw = supabase_get("water_zones?supplier=eq.Northern%20Ireland%20Water&select=zone_id&limit=10000")
existing_ids = {r["zone_id"] for r in existing_raw}
print(f"  {len(existing_ids)} Northern Ireland Water zones already in DB")

new_zones = [
    {"zone_id": z, "zone_name": f"Northern Ireland Water {z}", "supplier": "Northern Ireland Water"}
    for z in zones_2024
    if z not in existing_ids
]

if new_zones:
    print(f"\nInserting {len(new_zones)} new water_zones...")
    for i in range(0, len(new_zones), 200):
        batch = new_zones[i : i + 200]
        status = supabase_post("water_zones", batch)
        print(f"  Batch {i//200 + 1}: {len(batch)} rows → status {status}")
else:
    print("  All zones already exist, skipping.")
print()

# ── Step 3: Build chemical_readings from file 2 ─────────────────────────────────
print("=== Step 3: Upload chemical_readings ===\n")

# Only rows where Site Code is a valid zone (ZN*, ZS*)
zone_set = zones_2024
zone_chem_vals = defaultdict(lambda: defaultdict(list))
skipped_sites = set()

with open("2024-ni-water-customer-tap-supply-point-results.csv", encoding="utf-8-sig") as f:
    r = csv.DictReader(f)
    for row in r:
        site = row.get("Site Code", "").strip()
        if site not in zone_set:
            skipped_sites.add(site)
            continue
        param = row.get("Parameter", "").strip()
        if not param:
            continue
        raw = row.get("Report Value", row.get("Result", ""))
        try:
            val = float(str(raw).strip())
        except (ValueError, TypeError):
            continue
        unit = row.get("Units", "").strip() or "—"
        zone_chem_vals[site][param].append((val, unit))

print(f"  Zones with data: {len(zone_chem_vals)}")
print(f"  Skipped Site Codes (W* treatment works): {len(skipped_sites)}")

readings = []
for zone_id, params_dict in zone_chem_vals.items():
    for param, vals_with_units in params_dict.items():
        values = [v[0] for v in vals_with_units]
        units = [v[1] for v in vals_with_units if v[1]]
        avg = round(sum(values) / len(values), 4)
        unit = units[0] if units else "—"
        readings.append({
            "zone_id": zone_id,
            "chemical": param,
            "unit": unit,
            "value_raw": str(avg),
        })

print(f"  {len(readings)} readings to upload")

# Batch 200-500
batch_size = 300
total_ok = 0
for i in range(0, len(readings), batch_size):
    batch = readings[i : i + batch_size]
    status = supabase_post("chemical_readings", batch)
    if status in (200, 201):
        total_ok += len(batch)
    print(f"  Batch {i//batch_size + 1}/{-(-len(readings)//batch_size)}: {len(batch)} rows → status {status}")

print(f"\n✅ Done! {total_ok}/{len(readings)} readings uploaded")
