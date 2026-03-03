# Migrations

Run these in the Supabase SQL Editor.

## chemical_lookup.sql
LSOA bridge + chemical averages.

- **postcode_lsoa_lookup**: pcds, lsoa21cd
- **raw_chemical_samples**: lsoa21cd, determinand, Result, water_company

## sewage_spills.sql
Nearest sewage spill lookup for Haversine.

- **sewage_spills**: site_name, latitude, longitude, counted_spills, total_duration_hrs  
  (Adjust to match your EDM columns: "Site Name", "Latitude", "Longitude", etc.)
