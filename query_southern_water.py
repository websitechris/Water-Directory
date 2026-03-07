#!/usr/bin/env python3
"""Check Southern Water data in Supabase."""
import json
import urllib.request

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

def get(path):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={"apikey": SERVICE_ROLE_KEY, "Authorization": f"Bearer {SERVICE_ROLE_KEY}"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def main():
    # 1. water_zones where supplier = 'Southern Water'
    zones = get("water_zones?supplier=eq.Southern%20Water&select=zone_id,zone_name,supplier")
    zone_ids = [z["zone_id"] for z in zones]
    print("1. water_zones where supplier = 'Southern Water'")
    print(f"   Count: {len(zones)}")
    if zones:
        print("   Sample:", zones[:5])
    print()

    # 2. chemical_readings where zone_id belongs to Southern Water zones
    if zone_ids:
        in_list = ",".join(f'"{z}"' for z in zone_ids)
        chem = get(f"chemical_readings?zone_id=in.({in_list})&select=zone_id,chemical,value_raw,unit")
        print("2. chemical_readings where zone_id in Southern Water zones")
        print(f"   Count: {len(chem)}")
        if chem:
            print("   Sample:", chem[:5])
    else:
        print("2. chemical_readings: no Southern Water zones to match")

if __name__ == "__main__":
    main()
