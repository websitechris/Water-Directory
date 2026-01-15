# UK Water Quality Directory - Project Status & Next Steps

**Date:** January 4, 2026  
**Location:** `~/Desktop/water-directory/`  
**Developer:** Chris Pennington

---

## 🎯 PROJECT OVERVIEW

Building a comprehensive UK water quality directory that maps postcodes to water suppliers and water quality data. This project handles the complexity of:
- 25+ water companies (WaSCs, WoCs, NAVs)
- 2.7 million UK postcodes
- Geospatial "point-in-polygon" lookups for supplier boundaries
- NAVs (New Appointments & Variations) - small "islands" within larger regions

---

## ✅ COMPLETED (as of Jan 4, 2026)

### Database Setup
- **Platform:** Supabase (PostgreSQL)
- **Project:** Master_Directory_DB
- **Schema:** `water_directory` (separate from other business directories)

### Tables Created

#### 1. `water_directory.suppliers`
```sql
CREATE TABLE water_directory.suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  data_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Status:** ✅ Populated with 25 UK water companies

#### 2. `water_directory.postcodes`
```sql
CREATE TABLE water_directory.postcodes (
  postcode TEXT PRIMARY KEY,
  lat FLOAT,
  long FLOAT,
  supplier_id INT REFERENCES water_directory.suppliers(id),
  location GEOGRAPHY(POINT)
);
```
**Status:** ✅ Populated with 2,709,658 UK postcodes (ONS Nov 2024)

### Data Files
- **Location:** `~/Desktop/water-directory/`
- `postcodes.csv` - Original ONS data (1.3GB, 52 columns)
- `postcodes_clean.csv` - Extracted columns: pcd, lat, long
- `postcodes_final.csv` - Ready for import (header: postcode, lat, long)

---

## 🔧 DATABASE CONNECTION

### Connection String (Direct)
```
postgresql://postgres:[PASSWORD]@db.olgqzkkubqylfhswwzmf.supabase.co:5432/postgres
```
**Password:** jigxoh-2huqbe-bUpnen *(testing only - will change for production)*

### Quick Connect via psql
```bash
psql "postgresql://postgres:jigxoh-2huqbe-bUpnen@db.olgqzkkubqylfhswwzmf.supabase.co:5432/postgres"
```

---

## 🚀 NEXT STEPS (In Priority Order)

### Step 1: Add PostGIS Geography Column
The `location` column exists but is empty. We need to populate it with geography points for fast spatial queries.

**SQL to run:**
```sql
-- Update all postcodes with geography points
UPDATE water_directory.postcodes 
SET location = ST_SetSRID(ST_MakePoint(long, lat), 4326)::geography
WHERE location IS NULL;

-- Create spatial index for fast lookups
CREATE INDEX idx_postcodes_location ON water_directory.postcodes USING GIST(location);
```

**Why:** This converts lat/long into PostGIS geography objects that can do fast "point-in-polygon" queries.

---

### Step 2: Get Water Company Boundary Data

You need GIS shapefiles for:

1. **NAVs (New Appointments & Variations)** - Priority #1
   - Source: Ofwat's NAV Register
   - URL: https://www.ofwat.gov.uk/regulated-companies/nav-naa-information/
   - These are small "islands" that override the regional suppliers
   - Must query FIRST before checking regional boundaries

2. **WaSCs (Water and Sewerage Companies)** - The "Big 11"
   - Thames Water, United Utilities, Severn Trent, etc.
   - These cover large regions

3. **WoCs (Water Only Companies)** - Smaller regions
   - Affinity Water, Portsmouth Water, Bristol Water, etc.
   - In these areas, water != sewerage provider

**File Format:** Usually `.shp` (ESRI Shapefile) or `.geojson`

**Import Strategy:**
```sql
-- Example table structure for boundaries
CREATE TABLE water_directory.supplier_boundaries (
  id SERIAL PRIMARY KEY,
  supplier_id INT REFERENCES water_directory.suppliers(id),
  boundary_type TEXT, -- 'NAV', 'WaSC', 'WoC'
  geometry GEOGRAPHY(MULTIPOLYGON),
  priority INT -- NAVs = 1 (check first), WaSCs/WoCs = 2
);
```

---

### Step 3: Map Postcodes to Suppliers

Once you have boundaries loaded, run a point-in-polygon query:

```sql
-- Update supplier_id based on location
UPDATE water_directory.postcodes p
SET supplier_id = (
  SELECT sb.supplier_id
  FROM water_directory.supplier_boundaries sb
  WHERE ST_Intersects(p.location, sb.geometry)
  ORDER BY sb.priority ASC  -- NAVs first!
  LIMIT 1
)
WHERE p.supplier_id IS NULL;
```

**The Logic:**
1. Check if postcode is inside a NAV boundary (priority 1)
2. If not, check regional WaSC/WoC boundaries (priority 2)
3. Assign the supplier_id

---

### Step 4: Quality Reports Table (Future)

Eventually you'll need to store actual water quality data:

```sql
CREATE TABLE water_directory.quality_reports (
  id SERIAL PRIMARY KEY,
  supplier_id INT REFERENCES water_directory.suppliers(id),
  supply_zone TEXT,
  hardness_mg_l FLOAT,
  fluoride_mg_l FLOAT,
  lead_ug_l FLOAT,
  nitrate_mg_l FLOAT,
  ph FLOAT,
  report_date DATE,
  source_url TEXT
);
```

---

## 📚 KEY REFERENCE DOCUMENTS

### Already in Project
- `water_deep_research.txt` - Comprehensive regulatory & technical overview
- `igot_stuck.txt` - Previous conversation history

### Important Sections from Deep Research
- **Section 4:** The NAV Market (the "hidden" network)
- **Section 7:** Technical Data Ingestion Strategy
- **Appendix:** Master inventory of all water suppliers

---

## 🛠️ TOOLS & ENVIRONMENT

### Installed on Mac
- ✅ Homebrew (`/opt/homebrew/bin/brew`)
- ✅ PostgreSQL 14 (includes `psql` client)
- ✅ Cursor IDE

### Working Directory
```bash
cd ~/Desktop/water-directory
```

---

## ⚠️ CRITICAL TECHNICAL NOTES

### 1. NAV Priority
**Always check NAV boundaries FIRST before regional suppliers.**  
Example: MediaCityUK (Salford) is physically in United Utilities territory but served by Leep Utilities (a NAV).

### 2. Water Only vs. Sewerage
In areas with WoCs (Water Only Companies), the postcode might have:
- **Water supplier:** Portsmouth Water
- **Sewerage provider:** Southern Water  

Your directory only needs the **water** supplier for quality data.

### 3. Republic of Ireland Edge Case
~10% of Irish postcodes (Eircodes) are served by Group Water Schemes (private cooperatives), not Uisce Éireann. These won't have data in the main system.

---

## 💡 RECOMMENDED NEXT ACTIONS

### Immediate (Today/This Week)
1. Run the PostGIS geography update SQL
2. Research Ofwat NAV shapefiles - find download URL
3. Create supplier_boundaries table schema
4. Test import with one shapefile (e.g., Thames Water region)

### Short-term (Next 2 Weeks)
5. Import all WaSC/WoC boundaries
6. Import NAV boundaries
7. Run the supplier mapping query
8. Validate with known postcodes (e.g., SW1A 1AA should = Thames Water)

### Medium-term (Next Month)
9. Build API endpoint for postcode lookup
10. Scrape/ingest actual water quality data from supplier websites
11. Build frontend search interface

---

## 🔍 TESTING POSTCODES

Use these to verify your mapping is correct:

| Postcode | Expected Supplier | Notes |
|----------|------------------|-------|
| SW1A 1AA | Thames Water | Buckingham Palace, London |
| M50 2EQ | Leep Utilities | MediaCityUK (NAV site) |
| PO1 3AX | Portsmouth Water | Portsmouth (WoC, not Southern) |
| AB10 1AB | Scottish Water | Aberdeen |
| BT1 1AA | Northern Ireland Water | Belfast |

---

## 📞 RESOURCES & LINKS

- **Ofwat NAV Register:** https://www.ofwat.gov.uk/regulated-companies/nav-naa-information/
- **ONS Postcode Directory:** https://geoportal.statistics.gov.uk/
- **DWI Water Quality:** https://www.dwi.gov.uk/
- **PostGIS Documentation:** https://postgis.net/documentation/
- **Supabase Docs:** https://supabase.com/docs

---

## 🎓 KEY LEARNINGS SO FAR

1. Mac terminal doesn't show password characters when typing `sudo` - this is normal
2. ONS dataset has 2.7M postcodes (more than the "live" 1.6M - includes terminated ones)
3. Supabase's UI changed - connection string is now under "Connect" button, not in Settings
4. Always use `water_directory` schema, not `public`, to keep this project separate
5. CSV column was `pcd` but database expects `postcode` - needed `sed` to rename

---

**END OF HANDOFF DOCUMENT**

*For questions or issues, refer back to the deep research document or ask Claude.ai for strategic guidance. Use Cursor for code implementation and file processing.*
