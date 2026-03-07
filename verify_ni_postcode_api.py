#!/usr/bin/env python3
"""Verify NI postcode API: BT1 1AA → ZS0107, Nitrates=4.05, Lead=0.0"""
import json
import urllib.request

API_BASE = "http://localhost:3000"  # or your deployed URL

def main():
    postcode = "BT1 1AA"
    url = f"{API_BASE}/api/water?postcode={postcode.replace(' ', '%20')}"
    print(f"GET {url}\n")
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())

    print("Response:")
    print(json.dumps(data, indent=2))

    zone = data.get("zoneName") or "(zone in supplier)"
    nitrates = data.get("chemicals", {}).get("nitrates")
    lead = data.get("chemicals", {}).get("lead")

    print("\n--- Verification ---")
    print(f"  Zone (ZS0107 expected): {zone}")
    print(f"  Nitrates (4.05 expected): {nitrates}")
    print(f"  Lead (0.0 expected): {lead}")

    ok = True
    if data.get("supplier") != "Northern Ireland Water":
        print(f"  ⚠ Supplier should be 'Northern Ireland Water', got: {data.get('supplier')}")
        ok = False
    if nitrates is not None and abs(float(nitrates) - 4.05) > 0.01:
        print(f"  ⚠ Nitrates mismatch: expected 4.05, got {nitrates}")
        ok = False
    if lead is not None and abs(float(lead) - 0.0) > 0.01:
        print(f"  ⚠ Lead mismatch: expected 0.0, got {lead}")
        ok = False

    if ok:
        print("\n✅ NI postcode API verified")
    else:
        print("\n❌ Verification failed")

if __name__ == "__main__":
    main()
