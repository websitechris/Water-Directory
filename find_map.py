import requests

print("🔍 Searching UK Gov Open Data Vault (data.gov.uk) for Water Zones...\n")

url = "https://data.gov.uk/api/3/action/package_search"

# Querying specifically for Water Supply or Quality Zones
params = {
    "q": 'title:("water supply zones" OR "water quality zones" OR "drinking water")',
    "rows": 5
}

response = requests.get(url, params=params).json()

if response.get("success"):
    results = response["result"]["results"]
    if not results:
        print("❌ The government vault came up empty for those exact keywords.")
    else:
        print(f"✅ Found {len(results)} official government datasets!\n")
        
        for i, dataset in enumerate(results):
            title = dataset.get('title', 'No Title')
            publisher = dataset.get('organization', {}).get('title', 'Unknown Publisher')
            
            print(f"--- Dataset {i+1}: {title} ---")
            print(f"🏢 Publisher: {publisher}")
            
            # Let's see if they have actual downloadable files attached
            resources = dataset.get('resources', [])
            for res in resources:
                format_type = res.get('format', 'UNKNOWN').upper()
                # We are looking for spatial data (SHP, GEOJSON) or simple lists (CSV)
                if format_type in ['SHP', 'GEOJSON', 'CSV', 'ZIP']:
                    print(f"   ↳ 📁 {format_type} Download: {res.get('url')}")
            print("-" * 40)
else:
    print("❌ Failed to connect to the UK Gov API.")