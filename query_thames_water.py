#!/usr/bin/env python3
"""Investigate Thames Water data in Supabase."""
import json
import urllib.request

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

def get(path, headers_extra=None):
    h = {"apikey": SERVICE_ROLE_KEY, "Authorization": f"Bearer {SERVICE_ROLE_KEY}"}
    if headers_extra:
        h.update(headers_extra)
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{path}", headers=h)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def main():
    # 1. Count water_zones where supplier = 'Thames Water'
    zones = get("water_zones?supplier=eq.Thames%20Water&select=zone_id,zone_name,supplier")
    zone_ids = [z["zone_id"] for z in zones]
    print("1. water_zones where supplier = 'Thames Water'")
    print(f"   Count: {len(zones)}")
    print()

    # 2. Count chemical_readings where zone_id matches Thames Water zones
    # Use in filter: zone_id=in.(id1,id2,...)
    if zone_ids:
        in_list = ",".join(f'"{z}"' for z in zone_ids)
        chem_thames = get(f"chemical_readings?zone_id=in.({in_list})&select=zone_id,chemical,value_raw,unit")
    else:
        chem_thames = []
    print("2. chemical_readings where zone_id matches Thames Water zones")
    print(f"   Count: {len(chem_thames)}")
    print()

    # 3. Sample rows
    print("3. Sample rows from water_zones (Thames Water):")
    for i, z in enumerate(zones[:5]):
        print(f"   {i+1}. {z}")
    print()

    print("4. Sample rows from chemical_readings (Thames Water zones):")
    for i, r in enumerate(chem_thames[:5]):
        print(f"   {i+1}. {r}")
    print()

    # 5. Zone_id format analysis - LSOA codes typically:
    # - England: E01xxxxxx (9 chars), or older 95GG20S1 style
    # - Start with E/W/S/N for country
    # - Thames is London/south-east England - would use E-prefix LSOA
    print("5. Zone_id format analysis (Thames Water):")
    print(f"   Unique zone_ids: {len(zone_ids)}")
    if zone_ids:
        print(f"   Sample zone_ids: {zone_ids[:10]}")
        # Check format
        prefixes = {}
        for zid in zone_ids:
            p = zid[:2] if len(zid) >= 2 else zid
            prefixes[p] = prefixes.get(p, 0) + 1
        print(f"   Prefix distribution (first 2 chars): {prefixes}")
        lengths = {}
        for zid in zone_ids:
            L = len(zid)
            lengths[L] = lengths.get(L, 0) + 1
        print(f"   Length distribution: {lengths}")
        # LSOA 2011: E01xxxxxx (9 chars). LSOA 2021: similar.
        # Water supply zones often use different codes (e.g. SWB, ZS0107 for NI)
        non_lsoa = [z for z in zone_ids if not (len(z) == 9 and z[0] in "EWSN")]
        if non_lsoa:
            print(f"   Non-standard (not 9-char E/W/S/N): {non_lsoa[:15]}...")
        else:
            print("   All zone_ids appear to be LSOA format (9 chars, E/W/S/N)")

if __name__ == "__main__":
    main()
