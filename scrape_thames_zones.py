#!/usr/bin/env python3
"""
Scrape Thames Water zone PDFs from their water quality API.
If Content-Type is PDF, save to thames_pdfs/{code}.pdf and extract chemical data.
Output: thames_zones.csv (same format as think_digital_zones.csv)
Run with --test to try only 5 known codes: NLW33, OX30, SLW9, R31, OX13
"""
import argparse
import csv
import os
import re
import time
import urllib.request
import urllib.error

try:
    import pdfplumber
except ImportError:
    print("Install: pip install pdfplumber")
    raise

API_BASE_URL = "https://water-quality-api.prod.p.webapp.thameswater.co.uk/water-quality-api/Zone"
THINK_DIGITAL_BASE_URL = "https://www.thameswater.co.uk/globalassets/sharepoint-documents/think-digital-documents---all-documents"
PDF_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "thames_pdfs")
OUTPUT_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "thames_zones.csv")
DELAY = 0.5

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Water-Directory-Scraper/1.0"

# Known working codes for --test
TEST_CODES = ["NLW33", "OX30", "SLW9", "R31", "OX13"]

# Full brute-force patterns: (prefix, start, end)
PATTERNS = [
    ("NLW", 1, 61),
    ("SLW", 1, 61),
    ("SEW", 1, 61),
    ("OX", 1, 51),
    ("R", 1, 51),
    ("Z", 1, 301),  # Z0001-Z0300 (API + think-digital)
]

# Think-digital Z codes (same pattern as ESW/NWL)
THINK_DIGITAL_Z_RANGE = (1, 301)  # Z0001-Z0300


def fetch_from_api(code: str) -> tuple[bytes | None, str | None]:
    """GET API zone URL. Return (bytes, content_type) if 200, else (None, None)."""
    url = f"{API_BASE_URL}/{code}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            if r.status == 200:
                ct = r.headers.get("Content-Type", "").lower()
                return r.read(), ct
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None, None
        raise
    except (urllib.error.URLError, OSError):
        return None, None
    return None, None


def fetch_from_think_digital(code: str) -> tuple[bytes | None, str | None]:
    """GET think-digital PDF URL. Return (bytes, content_type) if 200, else (None, None)."""
    url = f"{THINK_DIGITAL_BASE_URL}/{code}.pdf"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            if r.status == 200:
                ct = r.headers.get("Content-Type", "").lower()
                return r.read(), ct or "application/pdf"
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None, None
        raise
    except (urllib.error.URLError, OSError):
        return None, None
    return None, None


def fetch_pdf(code: str) -> tuple[bytes | None, str | None]:
    """Fetch PDF: for Z-codes try think-digital first, then API; else API only."""
    if re.match(r"^Z\d{4}$", code):
        raw, ct = fetch_from_think_digital(code)
        if raw is not None:
            return raw, ct
    return fetch_from_api(code)


def extract_zone_name(text: str, zone_code: str) -> str:
    """Extract zone name from 'Water Supply Zone: 0058 PARLIAMENT Population: 51,079' or similar."""
    m = re.search(r"Water Supply Zone:\s*\d+\s+([A-Za-z][^P]+?)(?:\s+Population:|\n|$)", text, re.I)
    if m:
        return m.group(1).strip()[:200]
    m = re.search(r"Name of water supply zone:\s*[A-Z0-9]+\s*(.+?)(?:\n|$)", text, re.I | re.DOTALL)
    if m:
        return m.group(1).strip()[:200]
    m = re.search(r"water supply zone[:\s]+[A-Z0-9]+\s+(.+?)(?:\s+Population:|\n|$)", text, re.I | re.DOTALL)
    if m:
        return m.group(1).strip()[:200]
    return ""


def extract_hardness_mean(text: str) -> str | None:
    """Extract CaCO3 hardness mean from 'Hardness (Total) as CaCO3 mg/l - 252 260 268' or similar."""
    m = re.search(r"Hardness\s*\(Total\)\s+as\s+CaCO3\s+mg/l\s+(?:-\s+)?[\d.]+\s+([\d.]+)\s+[\d.]+", text, re.I)
    if m:
        return m.group(1)
    m = re.search(r"CaCO3\s*mg/l\s*(?:Calcium\s*Carbonate)?\s*([\d.]+)\s+[\d.]+\s+[\d.]+", text, re.I)
    if m:
        return m.group(1)
    m = re.search(r"Calcium\s*Carbonate\s+([\d.]+)\s+[\d.]+\s+[\d.]+", text, re.I)
    if m:
        return m.group(1)
    m = re.search(r"total\s+hardness\s+([\d.]+)\s+[\d.]+\s+[\d.]+", text, re.I)
    if m:
        return m.group(1)
    return None


def parse_mean_value(s: str) -> str | None:
    if not s or not str(s).strip():
        return None
    s = str(s).strip()
    if s.startswith("<"):
        return s
    try:
        float(s)
        return s
    except ValueError:
        return s


def extract_mean_from_min_mean_max(line: str) -> str | None:
    """Extract Mean (middle) from line ending with Min Mean Max (think-digital format)."""
    parts = line.split()
    if len(parts) < 3:
        return None
    values = []
    i = len(parts) - 1
    while i >= 0 and len(values) < 3:
        tok = parts[i]
        if re.match(r"^[\d.]+$", tok) and i > 0 and parts[i - 1] == "<":
            values.insert(0, f"< {tok}")
            i -= 2
        elif tok == "<" and i > 0 and re.match(r"^[\d.]+$", parts[i - 1]):
            values.insert(0, f"< {parts[i - 1]}")
            i -= 2
        elif re.match(r"^[\d.]+$", tok):
            values.insert(0, tok)
            i -= 1
        else:
            break
    if len(values) == 3:
        return parse_mean_value(values[1])
    return None


def extract_mean_thames_format(line: str) -> str | None:
    """Thames format: ... PCV Min Mean Max samples 0 0. Mean at parts[-5]."""
    parts = line.split()
    if len(parts) < 6:
        return None
    # Last 6: min, mean, max, samples, 0, 0 (or similar)
    mean_val = parts[-5]
    if re.match(r"^[\d.]+$", mean_val):
        return mean_val
    if mean_val.startswith("<") or (len(mean_val) > 1 and mean_val[0] == "<"):
        return mean_val
    return None


def extract_from_pdf(pdf_path: str, zone_code: str) -> dict:
    """Extract zone data from PDF using pdfplumber."""
    out = {
        "zone_code": zone_code,
        "zone_name": "",
        "hardness_caco3_mean": None,
        "nitrate_mean": None,
        "lead_mean": None,
        "fluoride_mean": None,
        "chlorine_mean": None,
    }
    full_text = ""

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            full_text += (page.extract_text() or "") + "\n"

    out["zone_name"] = extract_zone_name(full_text, zone_code)
    out["hardness_caco3_mean"] = extract_hardness_mean(full_text)

    for line in full_text.split("\n"):
        line_lower = line.lower().strip()
        if not line_lower:
            continue
        # Thames format: "Nitrate as NO3 mg/l 50 21 24 27..."
        if "nitrate as no3" in line_lower and "nitrite" not in line_lower:
            val = extract_mean_thames_format(line) or extract_mean_from_min_mean_max(line)
            if val and not out["nitrate_mean"]:
                out["nitrate_mean"] = val
        elif "lead as pb" in line_lower:
            val = extract_mean_thames_format(line) or extract_mean_from_min_mean_max(line)
            if val and not out["lead_mean"]:
                out["lead_mean"] = val
        elif "fluoride as f" in line_lower:
            val = extract_mean_thames_format(line) or extract_mean_from_min_mean_max(line)
            if val and not out["fluoride_mean"]:
                out["fluoride_mean"] = val
        elif "chlorine (residual)" in line_lower or "chlorine (total)" in line_lower:
            val = extract_mean_thames_format(line) or extract_mean_from_min_mean_max(line)
            if val and not out["chlorine_mean"]:
                out["chlorine_mean"] = val
        # Think-digital format fallbacks
        elif re.match(r"^nitrate\s+", line_lower) and "nitrite" not in line_lower:
            val = extract_mean_from_min_mean_max(line)
            if val and not out["nitrate_mean"]:
                out["nitrate_mean"] = val
        elif (re.match(r"^lead\s*\(.*\)", line_lower) or line_lower.startswith("lead ")) and re.search(r"\d", line):
            val = extract_mean_from_min_mean_max(line)
            if val and not out["lead_mean"]:
                out["lead_mean"] = val
        elif re.match(r"^fluoride\s+mg/l", line_lower) and re.search(r"\d", line):
            val = extract_mean_from_min_mean_max(line)
            if val and not out["fluoride_mean"]:
                out["fluoride_mean"] = val
        elif re.search(r"residual\s+disinfectant\s*[-–]?\s*total", line_lower):
            val = extract_mean_from_min_mean_max(line)
            if val and not out["chlorine_mean"]:
                out["chlorine_mean"] = val

    return out


def main():
    parser = argparse.ArgumentParser(description="Scrape Thames Water zone PDFs")
    parser.add_argument("--test", action="store_true", help="Run only 5 known API codes")
    parser.add_argument("--test-think-digital", action="store_true", help="Test Z0058 think-digital download only")

    args = parser.parse_args()

    if args.test_think_digital:
        print("Testing think-digital Z0058...")
        raw, ct = fetch_from_think_digital("Z0058")
        if raw:
            os.makedirs(PDF_DIR, exist_ok=True)
            path = os.path.join(PDF_DIR, "Z0058.pdf")
            with open(path, "wb") as f:
                f.write(raw)
            print(f"  Z0058: PDF saved ({len(raw)/1024:.0f}kb) → {path}")
        else:
            print("  Z0058: 404 (think-digital URL not available)")
        return

    if args.test:
        codes = TEST_CODES
        print("TEST MODE: 5 known codes only")
    else:
        codes = []
        for prefix, start, end in PATTERNS:
            if prefix == "Z":
                for i in range(start, end):
                    codes.append(f"Z{i:04d}")
            else:
                for i in range(start, end):
                    codes.append(f"{prefix}{i}")

    os.makedirs(PDF_DIR, exist_ok=True)
    results = []

    print(f"Scraping Thames Water zones → {OUTPUT_CSV}")
    print("Hits:")

    for code in codes:
        raw, content_type = fetch_pdf(code)
        if raw is None:
            time.sleep(DELAY)
            continue

        if "pdf" in (content_type or ""):
            pdf_path = os.path.join(PDF_DIR, f"{code}.pdf")
            with open(pdf_path, "wb") as f:
                f.write(raw)
            size_kb = len(raw) / 1024
            print(f"  {code}: PDF saved ({size_kb:.0f}kb)")

            try:
                row = extract_from_pdf(pdf_path, code)
                results.append(row)
            except Exception as e:
                print(f"    Extract error: {e}")

        time.sleep(DELAY)

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["zone_code", "zone_name", "hardness_caco3_mean", "nitrate_mean", "lead_mean", "fluoride_mean", "chlorine_mean"]
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(results)

    print(f"\nSaved {len(results)} zones to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
