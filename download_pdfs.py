import csv
import requests
import os
import time

def download_pdfs():
    print("📥 Booting up the PDF Vault Downloader...\n")
    
    # Create a neat folder on your Mac to store all the reports
    output_folder = "Thames_Water_Reports"
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # Open our stolen master list
    try:
        with open("thames_master_list.csv", "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                map_code = row["MapCode"]
                # Clean up the zone name so it makes a safe computer file name
                zone_name = row["ZoneName"].replace(" ", "_").replace("/", "-") 
                
                if not map_code:
                    continue
                    
                print(f"📄 Fetching PDF for: {row['ZoneName']} (Code: {map_code})...")
                
                # The UNLOCKED Backdoor URL!
                url = f"https://water-quality-api.prod.p.webapp.thameswater.co.uk/water-quality-api/Zone/{map_code}"
                
                headers = {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                }
                
                # Send the request
                response = requests.get(url, headers=headers)
                
                # If it succeeds and gives us a PDF...
                if response.status_code == 200 and b"%PDF" in response.content[:10]:
                    file_name = f"WQ_Report_{map_code}_{zone_name}.pdf"
                    file_path = os.path.join(output_folder, file_name)
                    
                    # Save the file to your hard drive
                    with open(file_path, "wb") as pdf_file:
                        pdf_file.write(response.content)
                        
                    print(f"   ✅ Saved: {file_name}")
                else:
                    print(f"   ❌ Failed to download. Status: {response.status_code}")
                
                # Take a 1.5-second breath so we don't crash their generator
                time.sleep(1.5)
                
    except FileNotFoundError:
        print("❌ Could not find 'thames_master_list.csv'.")
        
    print(f"\n🎉 HEIST COMPLETE! Check the '{output_folder}' folder in your directory.")

if __name__ == "__main__":
    download_pdfs()