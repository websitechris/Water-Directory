#!/usr/bin/env python3
"""Upload Yorkshire Water Drinking Water Quality CSV (Stream tall format) to Supabase.

Stream exports use one row per sample-determinand. Use DWI_CODE and/or
DETERMINAND_NAME to pick our four scorecard chemicals.

**Previous behaviour (excluded most non-matching rows):**
  Only rows where DETERMINAND/Determinand matched this exact set were kept:
    - "Lead (10 - will apply 25.12.2013)"
    - "Fluoride (Total)"
    - "Nitrate (Total)"
    - "Residual Disinfectant - Free"
    - "Residual Disinfectant - Total"
  Any other spelling (e.g. "Nitrate", "Nitrate (as NO3)", DWI_CODE-only rows with
  a different name column) was **skipped** — which often left only chlorine-style
  rows if those were the only exact matches in the file.

**This script:** maps by DWI_CODE first, then exact legacy names, then name patterns.

Supabase POST uses:
  Prefer: return=minimal,resolution=ignore-duplicates
so re-uploading overlapping chlorine (or other) rows should not 409.

Optional: python upload_yorkshire.py --inspect
  Prints unique (DWI_CODE, DETERMINAND_NAME) pairs in the CSV (optionally filter LSOA).
"""
from __future__ import annotations

import csv
import json
import os
import sys
import urllib.error
import urllib.request
from collections import defaultdict

SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

CSV_PATH = os.environ.get(
    "YORKSHIRE_CSV",
    "/Users/chrispennington/Downloads/Yorkshire Water Drinking Water Quality 2024_-611102186594418946.csv",
)

# ---------------------------------------------------------------------------
# Yorkshire Water — Stream / DWI determinand mapping (verify against CSV)
# ---------------------------------------------------------------------------
#
# | Priority | DWI_CODE | Example DETERMINAND_NAME values | -> DB chemical      | Unit  |
# |----------|----------|----------------------------------|---------------------|-------|
# | 1        | N2       | Nitrate, Nitrate (as NO3), Nitrate (Total), …      | Nitrate             | mg/l  |
# | 1        | P0       | Lead, Lead (10 - will apply …), …                  | Lead                | μg/l  |
# | 1        | F0       | Fluoride, Fluoride (Total), …                      | Fluoride            | mg/l  |
# | 1        | D0       | Chlorine (Residual), Chlorine (Total), …           | (see _chlorine_pair)| mg/l  |
# | 2        | —        | Exact strings below (legacy x-rayed exports)     | as mapped           |       |
# | 3        | —        | Name contains "nitrate" (not nitrite-only), etc.   | as mapped           |       |
#
# Chlorine disambiguation for D0 / chlorine names:
#   - "total" in name -> Chlorine (Total)
#   - "residual", "free", or "disinfectant" (without total) -> Chlorine (Residual)
#   - otherwise default -> Chlorine (Total)
#
LEGACY_EXACT_NAMES: dict[str, tuple[str, str]] = {
    "Lead (10 - will apply 25.12.2013)": ("Lead", "μg/l"),
    "Fluoride (Total)": ("Fluoride", "mg/l"),
    "Fluoride": ("Fluoride", "mg/l"),
    "Nitrate (Total)": ("Nitrate", "mg/l"),
    "Nitrate": ("Nitrate", "mg/l"),
    "Nitrate (as NO3)": ("Nitrate", "mg/l"),
    "Residual Disinfectant - Free": ("Chlorine (Residual)", "mg/l"),
    "Residual Disinfectant - Total": ("Chlorine (Total)", "mg/l"),
    "Chlorine (Residual)": ("Chlorine (Residual)", "mg/l"),
    "Chlorine (Total)": ("Chlorine (Total)", "mg/l"),
}

# Primary Stream codes (case-insensitive on read)
DWI_CODE_MAP: dict[str, tuple[str, str] | None] = {
    "N2": ("Nitrate", "mg/l"),
    "P0": ("Lead", "μg/l"),
    "F0": ("Fluoride", "mg/l"),
    # D0: disinfectant / chlorine — disambiguate with DETERMINAND_NAME
    "D0": None,
}


def _field(row: dict, *keys: str) -> str:
    for k in keys:
        if k in row and row[k] is not None and str(row[k]).strip():
            return str(row[k]).strip()
    return ""


def _chlorine_from_name(name: str) -> tuple[str, str]:
    nl = name.lower()
    if "total" in nl:
        return ("Chlorine (Total)", "mg/l")
    if "residual" in nl or "free" in nl:
        return ("Chlorine (Residual)", "mg/l")
    if "disinfectant" in nl and "total" not in nl:
        return ("Chlorine (Residual)", "mg/l")
    return ("Chlorine (Total)", "mg/l")


def resolve_target_chemical(row: dict) -> tuple[str, str] | None:
    """Return (db_chemical_name, unit) if this row is one of our four targets, else None."""
    code = _field(row, "DWI_CODE", "DWI Code", "Dwi_Code").upper()
    name = _field(
        row,
        "DETERMINAND_NAME",
        "Determinand_Name",
        "DETERMINAND",
        "Determinand",
    )

    if code in DWI_CODE_MAP:
        mapped = DWI_CODE_MAP[code]
        if mapped is not None:
            return mapped
        if code == "D0":
            return _chlorine_from_name(name)

    if name in LEGACY_EXACT_NAMES:
        return LEGACY_EXACT_NAMES[name]

    nl = name.lower()
    if not nl:
        return None

    # Nitrite is not our scorecard nitrate
    if "nitrite" in nl and "nitrate" not in nl:
        return None
    if "nitrate" in nl:
        return ("Nitrate", "mg/l")

    if nl == "lead" or nl.startswith("lead ") or nl.startswith("lead(") or "lead (" in nl:
        return ("Lead", "μg/l")

    if "fluoride" in nl:
        return ("Fluoride", "mg/l")

    if "chlorine" in nl or "disinfectant" in nl:
        return _chlorine_from_name(name)

    return None


def row_lsoa(row: dict) -> str:
    return _field(row, "LSOA21CD", "LSOA", "lsoa21cd")


def row_result_numeric(row: dict) -> float | None:
    raw = _field(row, "RESULT", "Result", "result")
    try:
        return float(raw)
    except (ValueError, TypeError):
        return None


def supabase_get(path: str):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        },
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def supabase_post(path: str, data: list):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        data=body,
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            # Merge duplicate logical rows on unique constraint instead of failing
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


def inspect_csv(path: str, lsoa_filter: str | None = None) -> None:
    """Print pairs seen in file; mark which resolve to a target chemical."""
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    pairs: set[tuple[str, str]] = set()
    matched_pairs: set[tuple[str, str]] = set()
    sample_rows: list[dict] = []

    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lsoa = row_lsoa(row)
            if lsoa_filter and lsoa != lsoa_filter:
                continue
            code = _field(row, "DWI_CODE", "DWI Code", "Dwi_Code").upper()
            name = _field(row, "DETERMINAND_NAME", "Determinand_Name", "DETERMINAND", "Determinand")
            pairs.add((code, name))
            if resolve_target_chemical(row) is not None:
                matched_pairs.add((code, name))
            if lsoa_filter and len(sample_rows) < 5:
                sample_rows.append(row)

    print(f"\nCSV: {path}")
    if lsoa_filter:
        print(f"Filtered LSOA: {lsoa_filter}")
    print(f"\nUnique (DWI_CODE, DETERMINAND_NAME) pairs: {len(pairs)}")
    print("\nCode | Name | Maps to target?")
    print("-" * 72)
    for code, name in sorted(pairs, key=lambda x: (x[0], x[1])):
        row = {"DWI_CODE": code, "DETERMINAND_NAME": name}
        ok = resolve_target_chemical(row) is not None
        flag = "YES" if ok else "no"
        print(f"{code or '—':4} | {name[:48] or '—':48} | {flag}")

    print(f"\nPairs that map to Nitrate/Lead/Fluoride/Chlorine*: {len(matched_pairs)}")

    if sample_rows:
        print(f"\nSample raw rows for {lsoa_filter} (first {len(sample_rows)}):")
        for r in sample_rows:
            print(dict(r))


def main() -> None:
    print(f"Reading {CSV_PATH}...")
    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV not found. Set YORKSHIRE_CSV or place file at default path.")
        return

    lsoa_vals: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))

    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            resolved = resolve_target_chemical(row)
            if resolved is None:
                continue
            lsoa_cd = row_lsoa(row)
            if not lsoa_cd:
                continue
            val = row_result_numeric(row)
            if val is None:
                continue
            chemical_name, _ = resolved
            lsoa_vals[lsoa_cd][chemical_name].append(val)

    print(f"  {len(lsoa_vals)} unique LSOAs | {sum(len(v) for v in lsoa_vals.values())} chemical buckets")

    print("\nFetching existing Yorkshire Water zones...")
    existing_raw = supabase_get(
        "water_zones?supplier=eq.Yorkshire%20Water&select=zone_id&limit=10000"
    )
    existing_ids = {r["zone_id"] for r in existing_raw}
    print(f"  {len(existing_ids)} Yorkshire Water zones already in DB")

    new_zones = [
        {
            "zone_id": lsoa_cd,
            "zone_name": f"Yorkshire Water {lsoa_cd}",
            "supplier": "Yorkshire Water",
        }
        for lsoa_cd in lsoa_vals
        if lsoa_cd not in existing_ids
    ]

    if new_zones:
        print(f"\nInserting {len(new_zones)} new water_zones...")
        batch_size = 200
        for i in range(0, len(new_zones), batch_size):
            batch = new_zones[i : i + batch_size]
            status = supabase_post("water_zones", batch)
            print(f"  Batch {i // batch_size + 1}: {len(batch)} rows → status {status}")
    else:
        print("  All zones already exist, skipping.")

    print("\nBuilding chemical readings...")
    readings: list[dict] = []
    # unit lookup: first matching legacy/exact for each chemical name
    _chem_units = {
        "Nitrate": "mg/l",
        "Lead": "μg/l",
        "Fluoride": "mg/l",
        "Chlorine (Residual)": "mg/l",
        "Chlorine (Total)": "mg/l",
    }

    for lsoa_cd, chemicals in lsoa_vals.items():
        for chemical_name, values in chemicals.items():
            avg = round(sum(values) / len(values), 4)
            unit = _chem_units[chemical_name]
            readings.append(
                {
                    "zone_id": lsoa_cd,
                    "chemical": chemical_name,
                    "unit": unit,
                    "value_raw": str(avg),
                }
            )

    print(f"  {len(readings)} readings to upload")

    print("\nUploading chemical readings...")
    batch_size = 300
    total_ok = 0
    for i in range(0, len(readings), batch_size):
        batch = readings[i : i + batch_size]
        status = supabase_post("chemical_readings", batch)
        if status in (200, 201):
            total_ok += len(batch)
        print(
            f"  Batch {i // batch_size + 1}/{-(-len(readings) // batch_size)}: "
            f"{len(batch)} rows → status {status}"
        )

    print(f"\n✅ Done! {total_ok}/{len(readings)} readings uploaded")


if __name__ == "__main__":
    if "--inspect" in sys.argv:
        lsoa_arg = None
        for i, a in enumerate(sys.argv):
            if a == "--lsoa" and i + 1 < len(sys.argv):
                lsoa_arg = sys.argv[i + 1]
        # Default inspect: York city centre LSOA often cited for chlorine-only checks
        if lsoa_arg is None and "--all" not in sys.argv:
            lsoa_arg = "E01013366"
            print("(Use --all for every LSOA, or --lsoa CODE)")
        inspect_csv(CSV_PATH, lsoa_filter=lsoa_arg)
    else:
        main()
