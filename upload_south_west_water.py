#!/usr/bin/env python3
"""Upload South West Water Drinking Water Quality CSV to Supabase.
X-rayed DETERMINAND: Lead  Total, Nitrate as NO3  Total, Chlorine (On Site)  Free/Total.
No Fluoride in this dataset.
"""
import csv
import json
import urllib.request
import urllib.error
from collections import defaultdict

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

# South West Water CSV determinand names (x-rayed) -> (DB chemical name, unit)
TARGET_DETERMINANDS = {
    "Lead  Total":                  ("Lead", "μg/l"),
    "Nitrate as NO3  Total":        ("Nitrate", "mg/l"),
    "Chlorine (On Site)  Free":     ("Chlorine (Residual)", "mg/l"),
    "Chlorine (On Site)  Total":    ("Chlorine (Total)", "mg/l"),
}

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
        print(f"  ERROR {e.code}: {e.read().decode()[:200]}")
        return e.code

CSV_PATH = "/Users/chrispennington/Downloads/South_West_Water_(SWB)_Drinking_Water_Quality_2023_-1812757862045199538.csv"
print(f"Reading {CSV_PATH}...")
lsoa_vals = defaultdict(lambda: defaultdict(list))

with open(CSV_PATH, encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        det = row.get("DETERMINAND", row.get("Determinand", "")).strip()
        if det not in TARGET_DETERMINANDS:
            continue
        lsoa_cd = row.get("LSOA", "").strip()
        if not lsoa_cd or not lsoa_cd.startswith(("E", "W")):
            continue
        try:
            val = float(str(row.get("Result", row.get("RESULT", ""))).strip())
        except (ValueError, TypeError):
            continue
        chemical_name, _ = TARGET_DETERMINANDS[det]
        lsoa_vals[lsoa_cd][chemical_name].append(val)

print(f"  {len(lsoa_vals)} unique LSOAs | {sum(len(v) for v in lsoa_vals.values())} chemical buckets")

print("\nFetching existing South West Water zones...")
existing_raw = supabase_get("water_zones?supplier=eq.South%20West%20Water&select=zone_id&limit=10000")
existing_ids = {r["zone_id"] for r in existing_raw}
print(f"  {len(existing_ids)} South West Water zones already in DB")

new_zones = [
    {"zone_id": lsoa_cd, "zone_name": f"South West Water {lsoa_cd}", "supplier": "South West Water"}
    for lsoa_cd in lsoa_vals
    if lsoa_cd not in existing_ids
]

if new_zones:
    print(f"\nInserting {len(new_zones)} new water_zones...")
    for i in range(0, len(new_zones), 200):
        batch = new_zones[i:i+200]
        status = supabase_post("water_zones", batch)
        print(f"  Batch {i//200 + 1}: {len(batch)} rows → status {status}")
else:
    print("  All zones already exist, skipping.")

print("\nBuilding chemical readings...")
readings = []
for lsoa_cd, chemicals in lsoa_vals.items():
    for chemical_name, values in chemicals.items():
        avg = round(sum(values) / len(values), 4)
        unit = next(u for det, (chem, u) in TARGET_DETERMINANDS.items() if chem == chemical_name)
        readings.append({"zone_id": lsoa_cd, "chemical": chemical_name, "unit": unit, "value_raw": str(avg)})

print(f"  {len(readings)} readings to upload")

print("\nUploading chemical readings...")
total_ok = 0
for i in range(0, len(readings), 300):
    batch = readings[i:i+300]
    status = supabase_post("chemical_readings", batch)
    if status in (200, 201):
        total_ok += len(batch)
    print(f"  Batch {i//300 + 1}/{-(-len(readings)//300)}: {len(batch)} rows → status {status}")

print(f"\n✅ Done! {total_ok}/{len(readings)} readings uploaded")
