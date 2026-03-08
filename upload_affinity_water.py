#!/usr/bin/env python3
"""
Upload Affinity Water to Supabase.
CSV: Affinity_Water_Domestic_Water_Quality_*.csv (multi-year, 353k rows)
Deduplicate: keep most recent reading per LSOA per Determinand using Sample_Date.
"""
import csv
import json
import os
import urllib.request
import urllib.error
from collections import defaultdict
from datetime import datetime

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

CSV_PATH = "/Users/chrispennington/Downloads/Affinity_Water_Domestic_Water_Quality_1317122303542539033.csv"

# Affinity Water determinands (x-rayed) -> (DB chemical name, unit)
TARGET_DETERMINANDS = {
    "Lead (10 - will apply 25.12.2013)": ("Lead", "μg/l"),
    "Nitrate":                          ("Nitrate", "mg/l"),
    "Residual Disinfectant - Total":     ("Chlorine (Total)", "mg/l"),
    "Fluoride":                         ("Fluoride", "mg/l"),
}

def parse_date(s):
    """Parse DD/MM/YYYY or YYYY-MM-DD."""
    if not s or not s.strip():
        return None
    s = s.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s[:10], fmt)
        except ValueError:
            continue
    return None

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
            "Accept-Profile": "water_directory",
            "Content-Profile": "water_directory",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        if e.code in (404, 406):
            req2 = urllib.request.Request(
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
            with urllib.request.urlopen(req2) as r:
                return r.status
        print(f"  ERROR {e.code}: {e.read().decode()[:200]}")
        return e.code

def main():
    print("=" * 60)
    print("Affinity Water — Upload (deduplicated)")
    print("=" * 60)

    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV not found at {CSV_PATH}")
        return

    # Step 1: Read CSV and deduplicate — keep most recent per (LSOA, Determinand)
    print(f"\n1. Reading {CSV_PATH}...")
    # (lsoa, determinand) -> (date, result)
    latest = {}

    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            det = row.get("Determinand", "").strip()
            if det not in TARGET_DETERMINANDS:
                continue
            lsoa = row.get("LSOA", "").strip()
            if not lsoa or not lsoa.startswith(("E", "W")):
                continue
            try:
                val = float(str(row.get("Result", "")).strip())
            except (ValueError, TypeError):
                continue
            dt = parse_date(row.get("Sample_Date", ""))
            if not dt:
                continue
            key = (lsoa, det)
            if key not in latest or dt > latest[key][0]:
                latest[key] = (dt, val)

    # Build lsoa_vals from deduplicated data
    lsoa_vals = defaultdict(lambda: defaultdict(list))
    for (lsoa, det), (_, val) in latest.items():
        chem, _ = TARGET_DETERMINANDS[det]
        lsoa_vals[lsoa][chem].append(val)

    csv_lsoas = set(lsoa_vals.keys())
    print(f"   Rows after dedup: {len(latest):,}")
    print(f"   Unique LSOAs: {len(csv_lsoas):,}")
    print(f"   Determinand mapping: {list(TARGET_DETERMINANDS.keys())}")

    # Step 2: Fetch existing Affinity Water zones
    print("\n2. Fetching existing Affinity Water zones...")
    existing_list = []
    start, step = 0, 1000
    while True:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/water_zones?supplier=eq.Affinity%20Water&select=zone_id",
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
    new_lsoas = csv_lsoas - existing_ids
    print(f"   Existing: {len(existing_ids):,} | New to add: {len(new_lsoas):,}")

    if not new_lsoas:
        print("\n   No new zones. Exiting.")
        print(f"   Final Affinity Water zone count: {len(existing_ids):,}")
        return

    # Step 3: Insert water_zones
    new_zones = [
        {"zone_id": z, "zone_name": f"Affinity Water {z}", "supplier": "Affinity Water"}
        for z in new_lsoas
    ]
    print(f"\n3. Inserting {len(new_zones)} water_zones (batch 200)...")
    zones_ok = 0
    for i in range(0, len(new_zones), 200):
        batch = new_zones[i : i + 200]
        status = supabase_post("water_zones", batch)
        if status in (200, 201):
            zones_ok += len(batch)
        print(f"   Batch {i//200 + 1}: {len(batch)} rows → {status}")

    # Step 4: Build and upload chemical_readings
    readings = []
    for lsoa_cd in new_lsoas:
        for chemical_name, values in lsoa_vals.get(lsoa_cd, {}).items():
            if not values:
                continue
            avg = round(sum(values) / len(values), 4)
            unit = next(u for det, (c, u) in TARGET_DETERMINANDS.items() if c == chemical_name)
            readings.append({"zone_id": lsoa_cd, "chemical": chemical_name, "unit": unit, "value_raw": str(avg)})

    print(f"\n4. Uploading {len(readings)} chemical_readings (batch 300)...")
    readings_ok = 0
    for i in range(0, len(readings), 300):
        batch = readings[i : i + 300]
        status = supabase_post("chemical_readings", batch)
        if status in (200, 201):
            readings_ok += len(batch)
        print(f"   Batch {i//300 + 1}/{-(-len(readings)//300)}: {len(batch)} rows → {status}")

    final = len(existing_ids) + zones_ok
    print("\n" + "=" * 60)
    print(f"Affinity Water — Final zone count: {final:,}")
    print("=" * 60)

if __name__ == "__main__":
    main()
