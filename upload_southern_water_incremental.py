#!/usr/bin/env python3
"""
Incremental upload: Southern Water — only NEW zones and chemical readings.
Uses full 2024 CSV (64,442 rows). Checks Determinand column before mapping.
"""
import csv
import json
import os
import urllib.request
import urllib.error
from collections import defaultdict

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

CSV_PATH = "/Users/chrispennington/Downloads/Southern_Water_Domestic_Drinking_Water_Quality_2024.csv"
if not os.path.exists(CSV_PATH):
    CSV_PATH = "/Users/chrispennington/Desktop/water-data-audit/Southern_Water_Domestic_Drinking_Water_Quality_2024.csv"

# Map CSV Determinand names -> (DB chemical name, default unit)
TARGET_DETERMINANDS = {
    "LEAD (UNFLUSHED)":       ("Lead", "μg/l"),
    "CHLORINE (FREE)":        ("Chlorine (Residual)", "mg/l"),
    "CHLORINE (TOTAL)":       ("Chlorine (Total)", "mg/l"),
    "NITRATE":                ("Nitrate", "mg/l"),
    "FLUORIDE":               ("Fluoride", "mg/l"),
}

def supabase_get_all(path, select=None):
    """Fetch all rows with pagination."""
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
                "apikey": SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
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
    print("=" * 60)
    print("Southern Water — Incremental Upload (NEW zones only)")
    print("=" * 60)

    # ── Step 1: Inspect CSV — unique LSOAs and Determinand values ─────────────
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
            if not lsoa_cd:
                continue
            try:
                val = float(row.get("Result", ""))
            except (ValueError, TypeError):
                continue
            chemical_name, _ = TARGET_DETERMINANDS[det]
            lsoa_vals[lsoa_cd][chemical_name].append(val)

    csv_lsoas = set(lsoa_vals.keys())
    print(f"   CSV rows processed: (filtered to target determinands)")
    print(f"   Unique LSOAs in CSV: {len(csv_lsoas):,}")
    print(f"   Determinand values used: {sorted(TARGET_DETERMINANDS.keys())}")
    print(f"   Other determinands in CSV (sample): {list(determinands_in_csv - set(TARGET_DETERMINANDS.keys()))[:8]}")

    # ── Step 2: Fetch existing Southern Water zones ─────────────────────────
    print("\n2. Fetching existing Southern Water zones from Supabase...")
    existing_raw = supabase_get_all(
        "water_zones",
        select="zone_id",
    )
    # Filter to Southern Water only (API doesn't support multiple filters easily for this)
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/water_zones?supplier=eq.Southern%20Water&select=zone_id",
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        },
    )
    existing_list = []
    start = 0
    step = 1000
    while True:
        req2 = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/water_zones?supplier=eq.Southern%20Water&select=zone_id",
            headers={
                "apikey": SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
                "Range": f"{start}-{start + step - 1}",
            },
        )
        with urllib.request.urlopen(req2) as r:
            rows = json.loads(r.read())
        if not rows:
            break
        existing_list.extend(rows)
        if len(rows) < step:
            break
        start += step

    existing_ids = {r["zone_id"] for r in existing_list}
    print(f"   Southern Water zones already in DB: {len(existing_ids):,}")

    # ── Step 3: New zones only ───────────────────────────────────────────────
    new_lsoas = csv_lsoas - existing_ids
    print(f"\n3. New LSOAs to add: {len(new_lsoas):,}")
    if not new_lsoas:
        print("   No new zones to upload. Exiting.")
        return

    # ── Step 4: Insert new water_zones ────────────────────────────────────────
    new_zones = [
        {
            "zone_id": lsoa_cd,
            "zone_name": f"Southern Water {lsoa_cd}",
            "supplier": "Southern Water",
        }
        for lsoa_cd in new_lsoas
    ]
    print(f"\n4. Inserting {len(new_zones)} new water_zones...")
    batch_size = 200
    zones_ok = 0
    for i in range(0, len(new_zones), batch_size):
        batch = new_zones[i : i + batch_size]
        status = supabase_post("water_zones", batch)
        if status in (200, 201):
            zones_ok += len(batch)
        print(f"   Batch {i // batch_size + 1}: {len(batch)} rows → status {status}")

    # ── Step 5: Build chemical_readings for NEW zones only ────────────────────
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

    print(f"\n5. Uploading {len(readings)} chemical_readings (new zones only)...")
    batch_size = 300
    readings_ok = 0
    for i in range(0, len(readings), batch_size):
        batch = readings[i : i + batch_size]
        status = supabase_post("chemical_readings", batch)
        if status in (200, 201):
            readings_ok += len(batch)
        print(f"   Batch {i // batch_size + 1}/{-(-len(readings) // batch_size)}: {len(batch)} rows → status {status}")

    # ── Report ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  New zones added:     {zones_ok:,}")
    print(f"  New readings added:  {readings_ok:,}")
    print(f"  Southern Water zones now: {len(existing_ids) + zones_ok:,}")
    print("=" * 60)

if __name__ == "__main__":
    main()
