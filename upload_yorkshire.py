#!/usr/bin/env python3
"""Upload Yorkshire Water Drinking Water Quality CSV to Supabase.
X-rayed DETERMINAND column: Lead, Fluoride, Nitrate, Chlorine mappings.
"""
import csv
import json
import urllib.request
import urllib.error
from collections import defaultdict

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

# Yorkshire Water CSV determinand names (x-rayed) -> (DB chemical name, unit)
TARGET_DETERMINANDS = {
    "Lead (10 - will apply 25.12.2013)": ("Lead", "μg/l"),
    "Fluoride (Total)":                  ("Fluoride", "mg/l"),
    "Nitrate (Total)":                   ("Nitrate", "mg/l"),
    "Residual Disinfectant - Free":      ("Chlorine (Residual)", "mg/l"),
    "Residual Disinfectant - Total":     ("Chlorine (Total)", "mg/l"),
}

def supabase_get(path):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        }
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
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode()[:200]}")
        return e.code

# ── Step 1: Read CSV and average by LSOA ──────────────────────────────────────
CSV_PATH = "/Users/chrispennington/Downloads/Yorkshire Water Drinking Water Quality 2024_-611102186594418946.csv"
print(f"Reading {CSV_PATH}...")
lsoa_vals = defaultdict(lambda: defaultdict(list))

with open(CSV_PATH, encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        det = row.get("DETERMINAND", row.get("Determinand", "")).strip()
        if det not in TARGET_DETERMINANDS:
            continue
        lsoa_cd = row.get("LSOA", "").strip()
        if not lsoa_cd:
            continue
        raw = row.get("RESULT", row.get("Result", ""))
        try:
            val = float(str(raw).strip())
        except (ValueError, TypeError):
            continue
        chemical_name, _ = TARGET_DETERMINANDS[det]
        lsoa_vals[lsoa_cd][chemical_name].append(val)

print(f"  {len(lsoa_vals)} unique LSOAs | {sum(len(v) for v in lsoa_vals.values())} chemical buckets")

# ── Step 2: Check which zones already exist ───────────────────────────────────
print("\nFetching existing Yorkshire Water zones...")
existing_raw = supabase_get("water_zones?supplier=eq.Yorkshire%20Water&select=zone_id&limit=10000")
existing_ids = {r["zone_id"] for r in existing_raw}
print(f"  {len(existing_ids)} Yorkshire Water zones already in DB")

# ── Step 3: Insert missing water_zones ────────────────────────────────────────
new_zones = [
    {
        "zone_id": lsoa_cd,
        "zone_name": f"Yorkshire Water {lsoa_cd}",
        "supplier": "Yorkshire Water",
    }
    for lsoa_cd in lsoa_vals
    if lsoa_cd not in existing_ids
]

if new_zones:
    print(f"\nInserting {len(new_zones)} new water_zones...")
    batch_size = 200
    for i in range(0, len(new_zones), batch_size):
        batch = new_zones[i:i+batch_size]
        status = supabase_post("water_zones", batch)
        print(f"  Batch {i//batch_size + 1}: {len(batch)} rows → status {status}")
else:
    print("  All zones already exist, skipping.")

# ── Step 4: Build averaged chemical_readings ───────────────────────────────────
print("\nBuilding chemical readings...")
readings = []
for lsoa_cd, chemicals in lsoa_vals.items():
    for chemical_name, values in chemicals.items():
        avg = round(sum(values) / len(values), 4)
        unit = next(
            u for det, (chem, u) in TARGET_DETERMINANDS.items()
            if chem == chemical_name
        )
        readings.append({
            "zone_id": lsoa_cd,
            "chemical": chemical_name,
            "unit": unit,
            "value_raw": str(avg),
        })

print(f"  {len(readings)} readings to upload")

# ── Step 5: Upload in batches ──────────────────────────────────────────────────
print("\nUploading chemical readings...")
batch_size = 300
total_ok = 0
for i in range(0, len(readings), batch_size):
    batch = readings[i:i+batch_size]
    status = supabase_post("chemical_readings", batch)
    if status in (200, 201):
        total_ok += len(batch)
    print(f"  Batch {i//batch_size + 1}/{-(-len(readings)//batch_size)}: {len(batch)} rows → status {status}")

print(f"\n✅ Done! {total_ok}/{len(readings)} readings uploaded")
