import csv
from supabase import create_client, Client

# --- INSERT YOUR CREDENTIALS HERE ---
SUPABASE_URL = "https://olgqzkkubqylfhswwzmf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMDc1MiwiZXhwIjoyMDgwNjk2NzUyfQ.9EVl-xE9a9RWpJpcvkj69GmWUArjxA7vpspHbhAmHJc"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_data():
    print("🚀 Connecting to Supabase to bridge the Thames Water data...")
    
    try:
        with open("thames_chemical_database.csv", "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                # The Zone Name in our CSV looks like 'NLW33_Parliament'
                # We split it to get the ID and the Name separately
                raw_name = row["Zone Name"]
                zone_id = raw_name.split("_")[0]
                zone_name = raw_name.split("_", 1)[1].replace("_", " ") if "_" in raw_name else raw_name
                
                # 1. UPSERT the Zone (Master Table)
                zone_payload = {
                    "zone_id": zone_id,
                    "zone_name": zone_name,
                    "supplier": "Thames Water"
                }
                supabase.table("water_zones").upsert(zone_payload, on_conflict="zone_id").execute()
                
                # 2. INSERT the Reading (Logs Table)
                reading_payload = {
                    "zone_id": zone_id,
                    "chemical": row["Chemical"],
                    "unit": row["Unit"],
                    "value_raw": row["Min | Mean | Max Results"]
                }
                supabase.table("chemical_readings").insert(reading_payload).execute()
                
                print(f"✅ Synced: {zone_name} -> {row['Chemical']}")

        print("\n🎉 DATA MIGRATION COMPLETE!")
        print("Your Supabase database now contains real Thames Water lab results.")

    except FileNotFoundError:
        print("❌ Error: 'thames_chemical_database.csv' not found. Run the extraction script first!")
    except Exception as e:
        print(f"❌ Supabase Error: {e}")

if __name__ == "__main__":
    upload_data()