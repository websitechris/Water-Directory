#!/usr/bin/env python3
"""Verify NI Water upload. BT1 1AA maps to zone ZS0107 via postcode-zone file."""
import csv
import json
import urllib.request

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjA3NTIsImV4cCI6MjA4MDY5Njc1Mn0.apqyKmh97veDquQDVxQg5IuFUDeNLwBlgml6s7kYyxs"

def main():
    postcode = "BT1 1AA"
    # Look up zone from postcode-zone file (NI uses supply zone, not LSOA)
    zone_id = None
    with open("postcode-v-zone-lookup-by-year.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row.get("POSTCODE", "").strip().upper() == postcode.replace(" ", "").upper():
                zone_id = row.get("2024", "").strip()
                break
            # Also try with space
            if row.get("POSTCODE", "").strip() == postcode:
                zone_id = row.get("2024", "").strip()
                break

    if not zone_id:
        print(f"Postcode {postcode} not found in NI zone lookup")
        return

    print(f"1. NI postcode-zone lookup: {postcode} → zone {zone_id}")

    print(f"\n2. Supabase water_zones (zone_id={zone_id})...")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/water_zones?zone_id=eq.{zone_id}&select=*",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"},
    )
    with urllib.request.urlopen(req) as r:
        zones = json.loads(r.read())
    if zones:
        for z in zones:
            print(f"   {z}")
    else:
        print("   (no zone found)")

    print(f"\n3. Supabase chemical_readings (zone_id={zone_id})...")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/chemical_readings?zone_id=eq.{zone_id}&select=chemical,value_raw,unit",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"},
    )
    with urllib.request.urlopen(req) as r:
        readings = json.loads(r.read())
    if readings:
        seen = {}
        for r in readings:
            c = r["chemical"]
            if c not in seen:
                seen[c] = r["value_raw"]
        for c, v in sorted(seen.items()):
            print(f"   {c}: {v}")
        scorecard = {"Nitrates": None, "Lead": None, "Chlorine": None, "Fluoride": None}
        for c, v in seen.items():
            chem = c.upper()
            if "LEAD" in chem: scorecard["Lead"] = v
            elif "NITRATE" in chem and "NITRITE" not in chem: scorecard["Nitrates"] = v
            elif "RESIDUAL" in chem or "DISINFECTANT" in chem:
                if not scorecard["Chlorine"] or "TOTAL" in chem:
                    scorecard["Chlorine"] = v
            elif "FLUORIDE" in chem: scorecard["Fluoride"] = v
        print(f"\n   Scorecard: Nitrates={scorecard['Nitrates']}, Lead={scorecard['Lead']}, Chlorine={scorecard['Chlorine']}, Fluoride={scorecard['Fluoride']}")
    else:
        print("   (no readings found)")

    print("\n✅ NI Water upload verified" if readings else "\n❌ No chemical readings found")

if __name__ == "__main__":
    main()
