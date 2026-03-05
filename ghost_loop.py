import undetected_chromedriver as uc
import json
import time
import csv
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def automated_ghost_loop():
    print("👻 Booting up the Automated Ghost Browser...")
    
    options = uc.ChromeOptions()
    options.set_capability("goog:loggingPrefs", {"performance": "ALL"})
    
    # Launch the undetectable browser
    driver = uc.Chrome(options=options, version_main=145)
    
    print("🌐 Going to the main Thames Water page to clear security...")
    main_url = "https://www.thameswater.co.uk/help/water-quality/check-your-water-quality"
    driver.get(main_url)
    
    print("\n🤖 BROWSER OPEN.")
    print("Please solve the Cloudflare 'I am human' check if it appears on screen.")
    print("Wait until you see the normal, empty search page with the Postcode box.")
    input("⚠️ PRESS ENTER HERE IN THE TERMINAL ONCE YOU HAVE CLEARED SECURITY... ")
    
    test_postcodes = ["SW1A 1AA", "TW7 7EU", "RG1 8DB", "OX1 1AA", "E1 6AN"]
    
    with open("thames_master_list.csv", "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["Postcode", "MapCode", "FeatureCode", "ZoneName"])
        
        print("\n🚀 Starting the Ghost Typist Loop...\n")
        
        for postcode in test_postcodes:
            print(f"📍 Searching for {postcode}...")
            
            # 1. Go to the clean main page to reset the website's brain
            driver.get(main_url)
            
            try:
                # 2. Wait until the Postcode input box actually appears on screen
                search_box = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, "//input"))
                )
                
                # 3. Wipe the memory logs clean right before we hit enter
                driver.get_log("performance") 
                
                # 4. Ghost type the postcode and hit the ENTER key!
                search_box.send_keys(postcode)
                time.sleep(1) # Brief pause like a human
                search_box.send_keys(Keys.RETURN)
                
            except Exception as e:
                print(f"   ❌ Could not find the search box for {postcode}. Skipping...")
                continue
            
            # 5. Give the API 6 seconds to fetch the data
            time.sleep(6)
            
            # 6. Rip the fresh memory logs
            logs = driver.get_log("performance")
            found = False
            
            for entry in logs:
                try:
                    message = json.loads(entry["message"])["message"]
                    
                    if message["method"] == "Network.responseReceived":
                        url = message["params"]["response"]["url"]
                        
                        if "/waterquality" in url and "PostCode" in url:
                            request_id = message["params"]["requestId"]
                            
                            # Rip the data from memory
                            body = driver.execute_cdp_cmd('Network.getResponseBody', {'requestId': request_id})
                            data = json.loads(body['body'])
                            
                            map_code = data.get('mapCode')
                            feature_code = data.get('featureCode')
                            zone_name = data.get('featureName')
                            
                            print(f"   ✅ Stolen: {zone_name} (MapCode: {map_code})")
                            
                            writer.writerow([postcode, map_code, feature_code, zone_name])
                            found = True
                            break
                except Exception:
                    continue
            
            if not found:
                print(f"   ❌ No data found for {postcode}.")
                
    print("\n🎉 LOOP COMPLETE! Check your folder for 'thames_master_list.csv'.")
    driver.quit()

if __name__ == "__main__":
    automated_ghost_loop()