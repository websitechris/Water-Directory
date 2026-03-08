#!/usr/bin/env python3
"""
Scrape water quality zone PDFs from think-digital-documents platform.
Brute forces Z001-Z999 on eswater.co.uk (Essex & Suffolk) and T001-T999 on nwl.co.uk (Northumbrian).
Downloads PDFs that return 200, extracts zone data with pdfplumber, saves to CSV.
Run overnight: python scrape_think_digital_pdfs.py
"""
import csv
import os
import re
import time
import urllib.request
import urllib.error
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("Install: pip install pdfplumber")
    raise

OUTPUT_CSV = os.path.expanduser("~/Desktop/Water-Directory/think_digital_zones.csv")
PDF_DIR = os.path.expanduser("~/Desktop/Water-Directory/think_digital_pdfs/")

# URL patterns: (base_url, code_prefix, code_range)
TARGETS = [
    ("https://www.eswater.co.uk/globalassets/sharepoint-documents/think-digital-documents---all-documents/", "Z", range(1, 1000)),
    ("https://www.nwl.co.uk/globalassets/sharepoint-documents/think-digital-documents---all-documents/", "T", range(1, 1000)),
]

# Optional: test SES Water (seswater.co.uk) - add if it uses same platform
# TARGETS.append(("https://www.seswater.co.uk/globalassets/sharepoint-documents/think-digital-documents---all-documents/", "Z", range(1, 100)))

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Water-Directory-Scraper/1.0"
REQUEST_DELAY = 0.5  # seconds between requests to avoid hammering

# Parameter name patterns (case-insensitive) -> our column name
PARAM_PATTERNS = {
    "hardness_caco3": [r"CaCO3\s*mg/l", r"calcium\s*carbonate", r"total\s*hardness"],
    "nitrate": [r"nitrate", r"nitrate\s*mg/l\s*NO3"],
    "lead": [r"lead", r"lead\s*\(total", r"lead\s*\(10"],
    "fluoride": [r"fluoride"],
    "chlorine": [r"residual\s*disinfectant", r"chlorine", r"total\s*chlorine"],
}


def fetch_pdf(url: str) -> bytes | None:
    """Fetch PDF; return bytes if 200, else None."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            if r.status == 200:
                return r.read()
    except (urllib.error.HTTPError, urllib.error.URLError, OSError):
        pass
    return None


def extract_zone_name(text: str, zone_code: str) -> str:
    """Extract zone name from 'Name of water supply zone: Z605 BILLERICAY & BRENTWOOD'."""
    m = re.search(r"Name of water supply zone:\s*[A-Z]?\d+\s*(.+?)(?:\n|$)", text, re.I | re.DOTALL)
    if m:
        return m.group(1).strip()[:200]
    return ""


def extract_hardness_mean(text: str) -> str | None:
    """Extract CaCO3 hardness mean (Average) from 'CaCO3 mg/l Calcium Carbonate 232.50 245.00 220.00' or Northumbrian format."""
    m = re.search(r"CaCO3\s*mg/l\s*(?:Calcium\s*Carbonate)?\s*([\d.]+)\s+[\d.]+\s+[\d.]+", text, re.I)
    if m:
        return m.group(1)
    m = re.search(r"Calcium\s*Carbonate\s+([\d.]+)\s+[\d.]+\s+[\d.]+", text, re.I)
    if m:
        return m.group(1)
    # Northumbrian: "total hardness 49.76 59.32 38.05" (Average Max Min) - use when no CaCO3
    m = re.search(r"total\s+hardness\s+([\d.]+)\s+[\d.]+\s+[\d.]+", text, re.I)
    if m:
        return m.group(1)
    return None


def parse_mean_value(s: str) -> str | None:
    """Parse mean value; handle '< 0.266' etc."""
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
    """
    Extract the Mean (middle) value from a line ending with Min Mean Max.
    Format: ... 8.7 16.467 25  or  ... < 0.065 < 0.266 1.534
    Returns the middle value as string (e.g. '16.467' or '< 0.266').
    """
    parts = line.split()
    if len(parts) < 3:
        return None
    # Parse backwards: collect 3 values. Each value is either a number or "<" + number.
    values = []
    i = len(parts) - 1
    while i >= 0 and len(values) < 3:
        tok = parts[i]
        # If number and prev token is "<", value is "< number"
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
        return parse_mean_value(values[1])  # Mean is middle
    return None


def extract_from_text(pdf_path: str, zone_code: str) -> dict:
    """
    Extract parameter means from PDF using text extraction.
    Table format: Parameter Units samples PCV above Min Mean Max (last 3 combined in text).
    Hardness from: 'Calcium Carbonate 232.50 245.00 220.00' (Average Max Min).
    """
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

    # Match data table lines: param ... Min Mean Max (last 3 numbers)
    for line in full_text.split("\n"):
        line_lower = line.lower().strip()
        if not line_lower:
            continue
        # Nitrate (exclude nitrite)
        if re.match(r"^nitrate\s+", line_lower) and "nitrite" not in line_lower:
            val = extract_mean_from_min_mean_max(line)
            if val and not out["nitrate_mean"]:
                out["nitrate_mean"] = val
        # Lead (data row has numbers at end; exclude description lines)
        elif (re.match(r"^lead\s*\(.*\)", line_lower) or line_lower.startswith("lead ")) and re.search(r"\d", line):
            val = extract_mean_from_min_mean_max(line)
            if val and not out["lead_mean"]:
                out["lead_mean"] = val
        # Fluoride (exclude lines that are just descriptions)
        elif re.match(r"^fluoride\s+mg/l", line_lower) and re.search(r"\d", line):
            val = extract_mean_from_min_mean_max(line)
            if val and not out["fluoride_mean"]:
                out["fluoride_mean"] = val
        # Residual disinfectant / chlorine
        elif re.search(r"residual\s+disinfectant\s*[-–]?\s*total", line_lower):
            val = extract_mean_from_min_mean_max(line)
            if val and not out["chlorine_mean"]:
                out["chlorine_mean"] = val

    return out


def main():
    os.makedirs(PDF_DIR, exist_ok=True)
    results = []
    downloaded = 0

    print("=" * 60)
    print("Think-Digital PDF Scraper")
    print("=" * 60)
    print(f"PDF dir: {PDF_DIR}")
    print(f"Output:  {OUTPUT_CSV}")
    print()

    for base_url, prefix, code_range in TARGETS:
        domain = base_url.split("/")[2]
        print(f"\n--- {domain} ({prefix}001-{prefix}{max(code_range):03d}) ---")
        for i in code_range:
            code = f"{prefix}{i:03d}"
            url = f"{base_url}{code}.pdf"
            pdf_path = os.path.join(PDF_DIR, f"{domain.replace('.', '_')}_{code}.pdf")

            if os.path.exists(pdf_path):
                print(f"  {code}: cached")
            else:
                data = fetch_pdf(url)
                if data:
                    with open(pdf_path, "wb") as f:
                        f.write(data)
                    downloaded += 1
                    print(f"  {code}: downloaded ({len(data)} bytes)")
                else:
                    if i <= 10 or i % 100 == 0:
                        print(f"  {code}: 404")
                time.sleep(REQUEST_DELAY)

            if os.path.exists(pdf_path):
                try:
                    row = extract_from_text(pdf_path, code)
                    results.append(row)
                except Exception as e:
                    print(f"  {code}: extract error: {e}")

    print(f"\nDownloaded {downloaded} new PDFs")
    print(f"Extracted {len(results)} zone records")

    # Write CSV
    if results:
        fieldnames = ["zone_code", "zone_name", "hardness_caco3_mean", "nitrate_mean", "lead_mean", "fluoride_mean", "chlorine_mean"]
        with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            w.writeheader()
            w.writerows(results)
        print(f"\nSaved to {OUTPUT_CSV}")
    else:
        print("\nNo results to save")

    print("=" * 60)


if __name__ == "__main__":
    main()
