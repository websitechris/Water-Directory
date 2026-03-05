import pandas as pd
from supabase import create_client
import numpy as np

# --- CREDENTIALS ---
SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_cambridge():
    file_path = "CAM_DomesticWaterQuality.csv"
    print(f"🚀 Processing {file_path}...")

    df = pd.read_csv(file_path).replace({np.nan: None})

    # Step 1: Sync the Zones (LSOAs) first so the database recognizes them
    unique_lsoas = df['LSOA'].unique()
    print(f"🏢 Registering {len(unique_lsoas)} Cambridge Water zones...")
    
    zone_batches = []
    for lsoa in unique_lsoas:
        if lsoa:
            zone_batches.append({"zone_id": lsoa, "zone_name": f"Cambridge Area {lsoa}", "supplier": "Cambridge Water"})
    
    # Upsert zones in batches of 200
    for i in range(0, len(zone_batches), 200):
        supabase.table("water_zones").upsert(zone_batches[i:i+200], on_conflict="zone_id").execute()

    # Step 2: Now filter and upload the chemicals
    target_determinands = ['Nitrate', 'Lead', 'Fluoride', 'Residual Disinfectant - Free', 'Residual Disinfectant - Total']
    filtered_df = df[df['DETERMINAND'].isin(target_determinands)].copy()

    upload_data = []
    for _, row in filtered_df.iterrows():
        chem_name = str(row['DETERMINAND'])
        if 'Disinfectant' in chem_name or 'Chlorine' in chem_name:
            chem_name = 'CHLORINE'
        
        if row['LSOA']:
            upload_data.append({
                "zone_id": row['LSOA'],
                "chemical": chem_name.upper(),
                "value_raw": str(row['RESULT']),
                "unit": row['UNITS']
            })

    print(f"📤 Uploading {len(upload_data)} chemical readings...")
    
    for i in range(0, len(upload_data), 200):
        supabase.table("chemical_readings").insert(upload_data[i:i+200]).execute()
        if i % 1000 == 0:
            print(f"✅ Synced {i} readings...")

    print("\n🎉 CAMBRIDGE IS OFFICIALLY LIVE!")

if __name__ == "__main__":
    upload_cambridge()