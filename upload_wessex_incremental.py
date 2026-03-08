#!/usr/bin/env python3
"""
Incremental upload: Wessex Water — only NEW zones and chemical readings.
CSV: Wessex_Water_Domestic_Water_Quality_2022_2024_view_*.csv
Determinand mapping (x-rayed): Lead (10), Fluoride (total), Nitrate (total),
  Residual disinfectant - free, Residual disinfectant - total
"""
import csv
import json
import os
import urllib.request
import urllib.error
from collections import defaultdict

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

CSV_PATH = "/Users/chrispennington/Downloads/Wessex_Water_Domestic_Water_Quality_2022_2024_view_7125219084619195602.csv"

# Wessex CSV determinand names (x-rayed) -> (DB chemical name, unit)
TARGET_DETERMINANDS = {
    "Lead (10)":                    ("Lead", "μg/l"),
    "Fluoride (total)":             ("Fluoride", "mg/l"),
    "Nitrate (total)":              ("Nitrate", "mg/l"),
    "Residual disinfectant - free":  ("Chlorine (Residual)", "mg/l"),
    "Residual disinfectant - total": ("Chlorine (Total)", "mg/l"),
}

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

def main():
    print("=" * 65)
    print("Wessex Water — Incremental Upload (NEW zones only)")
    print("=" * 65)

    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV not found at {CSV_PATH}")
        return

    # ── Step 1: Inspect CSV ─────────────────────────────────────────────────────
    print(f"\n1. Reading {CSV_PATH}...")
    determinands_in_csv = set()
    lsoa_vals = defaultdict(lambda: defaultdict(list))

    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            det = row.get("Determinand", "").strip()
            if det:
                determinands_in_csv.add(det)
            if det not in TARGET_DETERMINANDS:
                continue
            lsoa_cd = row.get("LSOA", "").strip()
            if not lsoa_cd or not lsoa_cd.startswith(("E", "W")):
                continue
            try:
                val = float(str(row.get("Result", "")).strip())
            except (ValueError, TypeError):
                continue
            chemical_name, _ = TARGET_DETERMINANDS[det]
            lsoa_vals[lsoa_cd][chemical_name].append(val)

    csv_lsoas = set(lsoa_vals.keys())
    print(f"   Columns: {list(csv.DictReader(open(CSV_PATH, encoding='utf-8-sig')).fieldnames)}")
    print(f"   Unique Determinand values (target): {sorted(TARGET_DETERMINANDS.keys())}")
    print(f"   Unique LSOAs in CSV (E/W, with target determinands): {len(csv_lsoas):,}")

    # ── Step 2: Fetch existing Wessex Water zones ───────────────────────────────
    print("\n2. Fetching existing Wessex Water zones from Supabase...")
    existing_list = []
    start = 0
    step = 1000
    while True:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/water_zones?supplier=eq.Wessex%20Water&select=zone_id",
            headers={
                "apikey": SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
                "Range": f"{start}-{start + step - 1}",
            },
        )
        with urllib.request.urlopen(req) as r:
            rows = json.loads(r.read())
        if not rows:
            break
        existing_list.extend(rows)
        if len(rows) < step:
            break
        start += step

    existing_ids = {r["zone_id"] for r in existing_list}
    print(f"   Wessex Water zones already in DB: {len(existing_ids):,}")

    # ── Step 3: New zones only ─────────────────────────────────────────────────────
    new_lsoas = csv_lsoas - existing_ids
    print(f"\n3. New LSOAs to add: {len(new_lsoas):,}")
    if not new_lsoas:
        print("   No new zones to upload. Exiting.")
        print(f"\n   Final Wessex Water zone count: {len(existing_ids):,}")
        return

    # ── Step 4: Insert new water_zones ─────────────────────────────────────────────
    new_zones = [
        {
            "zone_id": lsoa_cd,
            "zone_name": f"Wessex Water {lsoa_cd}",
            "supplier": "Wessex Water",
        }
        for lsoa_cd in new_lsoas
    ]
    print(f"\n4. Inserting {len(new_zones)} new water_zones (batch 200)...")
    batch_size = 200
    zones_ok = 0
    for i in range(0, len(new_zones), batch_size):
        batch = new_zones[i : i + batch_size]
        status = supabase_post("water_zones", batch)
        if status in (200, 201):
            zones_ok += len(batch)
        print(f"   Batch {i // batch_size + 1}: {len(batch)} rows → status {status}")

    # ── Step 5: Build chemical_readings for NEW zones only ───────────────────────────
    readings = []
    for lsoa_cd in new_lsoas:
        chemicals = lsoa_vals.get(lsoa_cd, {})
        for chemical_name, values in chemicals.items():
            if not values:
                continue
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

    print(f"\n5. Uploading {len(readings)} chemical_readings (batch 300)...")
    batch_size = 300
    readings_ok = 0
    for i in range(0, len(readings), batch_size):
        batch = readings[i : i + batch_size]
        status = supabase_post("chemical_readings", batch)
        if status in (200, 201):
            readings_ok += len(batch)
        print(f"   Batch {i // batch_size + 1}/{-(-len(readings) // batch_size)}: {len(batch)} rows → status {status}")

    # ── Report ─────────────────────────────────────────────────────────────────────
    final_count = len(existing_ids) + zones_ok
    print("\n" + "=" * 65)
    print("SUMMARY")
    print("=" * 65)
    print(f"  New zones added:        {zones_ok:,}")
    print(f"  New readings added:    {readings_ok:,}")
    print(f"  Wessex Water zones now: {final_count:,}")
    print("=" * 65)

if __name__ == "__main__":
    main()
