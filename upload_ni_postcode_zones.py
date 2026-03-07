#!/usr/bin/env python3
"""
Populate ni_postcode_zones table from NI Open Data postcode-v-zone CSV.
- Extracts POSTCODE and 2024 columns
- Strips spaces from postcodes (BT1 1AA → BT11AA) to match postcodes.io format
- Uploads in batches of 500
"""
import csv
import json
import urllib.request
import urllib.error
import os

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

CSV_URL = "https://admin.opendatani.gov.uk/dataset/38a9a8f1-9346-41a2-8e5f-944d87d9caf2/resource/f2bc12c1-4277-4db5-8bd3-b7bb027cc401/download/postcode-v-zone-lookup-by-year.csv"

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
        print(f"  ERROR {e.code}: {e.read().decode()[:500]}")
        return e.code

def main():
    csv_path = "postcode-v-zone-lookup-by-year.csv"
    if not os.path.exists(csv_path):
        print(f"Downloading CSV from {CSV_URL}...")
        req = urllib.request.Request(CSV_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as r:
            with open(csv_path, "wb") as f:
                f.write(r.read())
        print(f"  Saved to {csv_path}")
    else:
        print(f"Using local {csv_path}")

    rows = []
    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            postcode_raw = row.get("POSTCODE", "").strip()
            zone_id = row.get("2024", "").strip()
            if not postcode_raw or not zone_id or zone_id == "No Zone Identified":
                continue
            clean_postcode = postcode_raw.replace(" ", "").upper()
            rows.append({"postcode": clean_postcode, "zone_id": zone_id})

    print(f"Extracted {len(rows)} postcode→zone rows (POSTCODE + 2024, stripped to BT11AA format)")

    batch_size = 500
    total_ok = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        status = supabase_post("ni_postcode_zones", batch)
        if status in (200, 201):
            total_ok += len(batch)
        print(f"  Batch {i // batch_size + 1}/{-(-len(rows) // batch_size)}: {len(batch)} rows → status {status}")

    print(f"\n✅ Done! {total_ok}/{len(rows)} rows uploaded to ni_postcode_zones")

if __name__ == "__main__":
    main()
