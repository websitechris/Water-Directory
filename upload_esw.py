#!/usr/bin/env python3
"""
Upload Essex & Suffolk Water (ESW) zones and chemical readings from think_digital_zones.csv.
Uses Z-codes as zone_id (e.g. Z501, Z601). Strips < from values before uploading.
Based on upload_anglian.py.
"""
import csv
import json
import os
import urllib.request
import urllib.error

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

CSV_PATH = os.path.expanduser("~/Desktop/Water-Directory/think_digital_zones.csv")
SUPPLIER = "Essex & Suffolk Water"

# CSV columns -> (DB chemical name, unit)
CHEMICAL_MAP = {
    "hardness_caco3_mean": ("Hardness (CaCO3)", "mg/l"),
    "nitrate_mean": ("Nitrate", "mg/l"),
    "lead_mean": ("Lead", "μg/l"),
    "fluoride_mean": ("Fluoride", "mg/l"),
    "chlorine_mean": ("Chlorine (Total)", "mg/l"),
}


def strip_lt(val):
    """Strip leading '< ' from values (e.g. '< 0.266' -> '0.266')."""
    if val is None or val == "":
        return None
    s = str(val).strip()
    if s.startswith("<"):
        s = s[1:].strip()
    return s if s else None


def supabase_get(path):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        },
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


# ── Step 0: Add Essex & Suffolk Water to suppliers table ─────────────────────
print("Adding Essex & Suffolk Water to suppliers table...")
try:
    status = supabase_post("suppliers", [{
        "name": SUPPLIER,
        "website": "https://www.eswater.co.uk",
        "data_url": "https://www.eswater.co.uk/globalassets/sharepoint-documents/think-digital-documents---all-documents/",
    }])
    if status in (200, 201):
        print("  Supplier added.")
    else:
        print(f"  (suppliers insert returned {status}; table may not exist or row may already exist)")
except Exception as e:
    print(f"  (suppliers insert skipped: {e})")

# ── Step 1: Read CSV (Z-rows only) ───────────────────────────────────────────
print(f"\nReading {CSV_PATH}...")
zones = []
readings = []

with open(CSV_PATH, encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        zone_code = row.get("zone_code", "").strip()
        if not zone_code.startswith("Z"):
            continue
        zone_name = row.get("zone_name", "").strip()
        zones.append({"zone_id": zone_code, "zone_name": zone_name, "supplier": SUPPLIER})

        for col, (chemical_name, unit) in CHEMICAL_MAP.items():
            raw = row.get(col, "").strip()
            if not raw:
                continue
            val = strip_lt(raw)
            if val is None:
                continue
            readings.append({
                "zone_id": zone_code,
                "chemical": chemical_name,
                "unit": unit,
                "value_raw": val,
            })

print(f"  {len(zones)} Z-zones | {len(readings)} chemical readings")

# ── Step 2: Check which zones already exist ─────────────────────────────────
print(f"\nFetching existing {SUPPLIER} zones...")
existing_raw = supabase_get(
    f"water_zones?supplier=eq.{SUPPLIER.replace(' ', '%20')}&select=zone_id&limit=10000"
)
existing_ids = {r["zone_id"] for r in existing_raw}
print(f"  {len(existing_ids)} zones already in DB")

# ── Step 3: Insert water_zones first ────────────────────────────────────────
new_zones = [z for z in zones if z["zone_id"] not in existing_ids]
if new_zones:
    print(f"\nInserting {len(new_zones)} water_zones...")
    batch_size = 200
    for i in range(0, len(new_zones), batch_size):
        batch = new_zones[i : i + batch_size]
        status = supabase_post("water_zones", batch)
        print(f"  Batch {i // batch_size + 1}: {len(batch)} rows → status {status}")
else:
    print("  All zones already exist, skipping.")

# ── Step 4: Upload chemical_readings in batches of 200 ──────────────────────
print("\nUploading chemical readings (batch size 200)...")
batch_size = 200
total_ok = 0
for i in range(0, len(readings), batch_size):
    batch = readings[i : i + batch_size]
    status = supabase_post("chemical_readings", batch)
    if status in (200, 201):
        total_ok += len(batch)
    print(f"  Batch {i // batch_size + 1}/{-(-len(readings) // batch_size)}: {len(batch)} rows → status {status}")

print(f"\n✅ Done! {total_ok}/{len(readings)} readings uploaded for {len(zones)} zones")
