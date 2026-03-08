#!/usr/bin/env python3
"""
Map postcodes to Thames Water zone codes using Playwright.
Loads Thames Water water quality page, enters postcode, extracts zone name, matches to thames_zones.csv.
Output: thames_postcode_map.csv (postcode, zone_name, zone_code)

Note: Thames site may use Cloudflare; if results stay on "Loading...", try: python map_thames_postcodes.py --headed
"""
import csv
import os
import re
import time

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Install: pip install playwright && playwright install chromium")
    raise

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CHECK_URL = "https://www.thameswater.co.uk/help/water-and-waste-help/water-quality/check-your-water-quality"
ZONES_CSV = os.path.join(SCRIPT_DIR, "thames_zones.csv")
OUTPUT_CSV = os.path.join(SCRIPT_DIR, "thames_postcode_map.csv")

TEST_POSTCODES = [
    "SW1A 1AA",
    "W1A 1AA",
    "E1 6AN",
    "N1 9GU",
    "SE1 7PB",
    "OX1 1AA",
    "RG1 1AA",
]


def load_zone_lookup() -> dict[str, str]:
    """Build zone_name (uppercase) -> zone_code from thames_zones.csv."""
    lookup = {}
    if not os.path.exists(ZONES_CSV):
        return lookup
    with open(ZONES_CSV, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("zone_name") or "").strip().upper()
            code = (row.get("zone_code") or "").strip()
            if name and code:
                lookup[name] = code
    return lookup


def normalize_zone_name(text: str) -> str | None:
    """Extract zone name from 'Your water supply zone is Parliament' etc. Returns None if not found."""
    if not text or len(text) > 500:
        return None
    text = text.strip()
    # "Your water supply zone is Parliament" -> "Parliament"
    m = re.search(r"water supply zone\s+is\s+([A-Za-z][A-Za-z\s&'-]+?)(?:\.|$|\n)", text, re.I)
    if m:
        return m.group(1).strip()
    # "Zone: Parliament" or "Supply zone: Parliament"
    m = re.search(r"(?:supply\s+)?zone\s+is\s+([A-Za-z][A-Za-z\s&'-]+?)(?:\.|$|\n)", text, re.I)
    if m:
        return m.group(1).strip()
    return None


def match_zone(zone_name: str, lookup: dict[str, str]) -> str | None:
    """Match extracted zone name to zone_code. Case-insensitive."""
    if not zone_name or len(zone_name) > 100:
        return None
    name_upper = zone_name.upper().strip()
    # Exact match
    if name_upper in lookup:
        return lookup[name_upper]
    # Normalized: replace & with AND, collapse spaces
    normalized = re.sub(r"\s+", " ", name_upper.replace("&", "AND"))
    if normalized in lookup:
        return lookup[normalized]
    # Zone name contained in CSV name (e.g. "Parliament" matches "PARLIAMENT")
    for csv_name, code in lookup.items():
        csv_norm = re.sub(r"\s+", " ", csv_name.replace("&", "AND"))
        if name_upper == csv_norm:
            return code
        # Site says "Parliament", CSV has "PARLIAMENT"
        if re.sub(r"[^\w\s]", "", name_upper) == re.sub(r"[^\w\s]", "", csv_norm):
            return code
    return None


def lookup_postcode(page, postcode: str, zone_lookup: dict[str, str]) -> tuple[str | None, str | None]:
    """
    Enter postcode, submit, extract zone name. Return (zone_name, zone_code) or (None, None).
    """
    input_el = page.query_selector("#wqc-postcode")
    if not input_el:
        return None, None

    input_el.fill("")
    time.sleep(0.3)
    input_el.fill(postcode)
    time.sleep(0.5)

    # Dismiss cookie banner if it blocks (OneTrust)
    try:
        overlay = page.query_selector(".onetrust-pc-dark-filter")
        if overlay and overlay.is_visible():
            acc = page.query_selector("#onetrust-accept-btn-handler")
            if acc:
                acc.click(force=True)
                time.sleep(1)
    except Exception:
        pass

    # Submit: Thames uses #wqc-search button
    btn = page.query_selector("#wqc-search")
    if btn:
        btn.click(force=True)
    else:
        input_el.press("Enter")

    # Wait for "Loading..." to disappear (result loaded)
    try:
        page.wait_for_selector("text=Loading...", state="hidden", timeout=20000)
    except Exception:
        pass
    time.sleep(3)

    # Extract zone text from page
    body_text = page.inner_text("body")
    zone_name = normalize_zone_name(body_text)
    if not zone_name:
        m = re.search(r"(?:water supply zone|supply zone)\s+is\s+([A-Za-z][A-Za-z\s&'-]+?)(?:\.|$|\n)", body_text, re.I)
        if m:
            zone_name = m.group(1).strip()
        else:
            # "Water quality in SW1A 1AA" - zone might appear in next section after Loading
            m = re.search(r"Water quality in [A-Z0-9\s]+\s*\n\s*([A-Za-z][A-Za-z\s&'-]+?)(?:\n|$)", body_text)
            if m:
                zone_name = m.group(1).strip()

    zone_code = match_zone(zone_name, zone_lookup) if zone_name else None
    return zone_name or None, zone_code


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Map postcodes to Thames Water zones")
    parser.add_argument("--headed", action="store_true", help="Run browser visibly (may help with Cloudflare)")
    parser.add_argument("--postcodes", nargs="+", help="Override postcodes (default: test list)")
    args = parser.parse_args()

    zone_lookup = load_zone_lookup()
    if not zone_lookup:
        print(f"Warning: No zones loaded from {ZONES_CSV}")

    postcodes = args.postcodes or TEST_POSTCODES

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = context.new_page()

        page.goto(CHECK_URL, wait_until="networkidle", timeout=20000)
        time.sleep(2)

        # Dismiss cookie consent (OneTrust)
        try:
            acc = page.query_selector("#onetrust-accept-btn-handler")
            if acc and acc.is_visible():
                acc.click()
                time.sleep(1)
        except Exception:
            pass

        for postcode in postcodes:
            zone_name, zone_code = lookup_postcode(page, postcode, zone_lookup)
            row = {
                "postcode": postcode,
                "zone_name": zone_name or "",
                "zone_code": zone_code or "",
            }
            results.append(row)
            print(f"  {postcode}: {zone_name or '—'} → {zone_code or '—'}")

        browser.close()

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["postcode", "zone_name", "zone_code"])
        w.writeheader()
        w.writerows(results)

    print(f"\nSaved to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
