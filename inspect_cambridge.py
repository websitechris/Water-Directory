import pandas as pd

def inspect_cambridge():
    file_path = "CAM_DomesticWaterQuality.csv"
    
    print(f"🚀 X-Raying {file_path}...")
    
    try:
        # Load the CSV (using standard encoding)
        df = pd.read_csv(file_path)
        
        print(f"✅ SUCCESS! Loaded {len(df)} rows.")
        print("\n🔎 COLUMN HEADERS:")
        print(df.columns.tolist())
        
        # Let's peek at the actual data for the first 5 rows
        print("\n📝 FIRST 5 ROWS:")
        print(df.head(5))

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    inspect_cambridge()