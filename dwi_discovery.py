import pandas as pd
import os

def discover_local_motherlode():
    file_path = "dwi_data.csv"
    
    if not os.path.exists(file_path):
        print(f"❌ Error: {file_path} not found.")
        return

    print("🚀 Reading local DWI Motherlode (v2)...")
    
    try:
        # 🛠️ THE FIX: skip the first few lines of text to find the table
        # We also use 'engine=python' to be more flexible with irregular files
        df = pd.read_csv(
            file_path, 
            encoding='latin-1', 
            skiprows=4,  # Skip the metadata title lines
            on_bad_lines='skip', # Don't crash if one row is messy
            engine='python' 
        )
        
        print(f"✅ SUCCESS! Loaded {len(df)} rows.")
        
        # Check if we have the right columns now
        print("\n🔎 DETECTED COLUMNS:")
        print(df.columns.tolist())

        # Look for our 'Big 4' (Standardized Names in DWI reports)
        target_chemicals = ['Nitrate', 'Lead', 'Chlorine', 'Fluoride']
        
        # Let's see the data
        print("\n🧪 TARGET CHEMICAL SNEAK PEEK:")
        # We search the first 4 columns for chemical matches
        mask = df.stack().str.contains('|'.join(target_chemicals), case=False, na=False).any(level=0)
        found = df[mask]
        
        print(found.head(10))

    except Exception as e:
        print(f"❌ Still hitting an error: {e}")
        print("\n💡 TIP: Try opening 'dwi_data.csv' in Cursor to see which line the table actually starts on.")

if __name__ == "__main__":
    discover_local_motherlode()