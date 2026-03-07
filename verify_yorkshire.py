#!/usr/bin/env python3
"""Verify Yorkshire Water upload: postcodes.io → LSOA → Supabase lookup."""
import json
import urllib.request

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjA3NTIsImV4cCI6MjA4MDY5Njc1Mn0.apqyKmh97veDquQDVxQg5IuFUDeNLwBlgml6s7kYyxs"

def main():
    # LS1 1AA is terminated (2002); using LS1 1UR (valid Leeds postcode)
    postcode = "LS1 1UR"
    print("Note: LS1 1AA is terminated; verifying with LS1 1UR (Leeds).\n")
    print(f"1. Postcodes.io lookup for {postcode}...")
    req = urllib.request.Request(
        f"https://api.postcodes.io/postcodes/{postcode.replace(' ', '%20')}"
    )
    with urllib.request.urlopen(req) as r:
        geo = json.loads(r.read())
    if geo.get("status") != 200 or "result" not in geo:
        print("   ERROR:", geo.get("error", "No result"))
        return
    codes = geo["result"].get("codes", {})
    lsoa = codes.get("lsoa") or codes.get("lsoa21")
    print(f"   LSOA code: {lsoa}")

    print(f"\n2. Supabase water_zones (zone_id={lsoa})...")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/water_zones?zone_id=eq.{lsoa}&select=*",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"},
    )
    with urllib.request.urlopen(req) as r:
        zones = json.loads(r.read())
    if zones:
        for z in zones:
            print(f"   {z}")
    else:
        print("   (no zone found)")

    print(f"\n3. Supabase chemical_readings (zone_id={lsoa})...")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/chemical_readings?zone_id=eq.{lsoa}&select=chemical,value_raw,unit",
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
        # Scorecard mapping (matches API route logic)
        scorecard = {"Nitrates": None, "Lead": None, "Chlorine": None, "Fluoride": None}
        for c, v in seen.items():
            chem = c.upper()
            if "LEAD" in chem: scorecard["Lead"] = v
            elif "NITRATE" in chem: scorecard["Nitrates"] = v
            elif "CHLORINE" in chem or "DISINFECTANT" in chem:
                if not scorecard["Chlorine"] or "(TOTAL)" in chem:
                    scorecard["Chlorine"] = v
            elif "FLUORIDE" in chem: scorecard["Fluoride"] = v
        print(f"\n   Scorecard display: Nitrates={scorecard['Nitrates']}, Lead={scorecard['Lead']}, Chlorine={scorecard['Chlorine']}, Fluoride={scorecard['Fluoride']}")
    else:
        print("   (no readings found)")

    print("\n✅ Yorkshire Water upload verified" if readings else "\n❌ No chemical readings found")

if __name__ == "__main__":
    main()
