import undetected_chromedriver as uc
import json
import time

def ghost_wiretap():
    print("👻 Booting up the patched Ghost Browser...")
    
    # Configure Chrome to secretly log all network traffic in the background
    options = uc.ChromeOptions()
    options.set_capability("goog:loggingPrefs", {"performance": "ALL"})
    
    # Launch the undetectable browser, forcing it to use version 145
    driver = uc.Chrome(options=options, version_main=145)
    
    print("🌐 Going to Thames Water...")
    driver.get("https://www.thameswater.co.uk/help/water-quality/check-your-water-quality")
    
    print("\n🤖 BROWSER OPEN. Your final mission:")
    print("1. Cloudflare might auto-clear, or you may need to click 'I am human'.")
    print("2. Type SW1A 1AA into the search bar.")
    print("3. Click Search.")
    
    # We pause the Python script and wait for you to do the search manually
    input("\n⚠️ PRESS ENTER IN THIS TERMINAL *ONLY AFTER* THE RESULTS APPEAR ON SCREEN... ")
    
    print("\n🕵️ Ripping the JSON payload from Chrome's memory...")
    
    # Pull the raw network logs
    logs = driver.get_log("performance")
    
    found = False
    for entry in logs:
        try:
            message = json.loads(entry["message"])["message"]
            
            # Look for the exact moment the API returned the data
            if message["method"] == "Network.responseReceived":
                url = message["params"]["response"]["url"]
                
                if "/waterquality" in url and "PostCode" in url:
                    request_id = message["params"]["requestId"]
                    
                    # CDP MAGIC: Extract the body of the response directly from memory!
                    body = driver.execute_cdp_cmd('Network.getResponseBody', {'requestId': request_id})
                    data = json.loads(body['body'])
                    
                    print("\n✅ SUCCESS! THE VAULT IS OPEN. STOLEN DATA:")
                    print("-" * 30)
                    print(f"Map Code (Zone ID): {data.get('mapCode')}")
                    print(f"Feature Code:       {data.get('featureCode')}")
                    print(f"Zone Name:          {data.get('featureName')}")
                    print("-" * 30)
                    found = True
                    break
        except Exception:
            continue
            
    if not found:
        print("❌ Could not find the network packet. Did the search fully load?")
        
    driver.quit()

if __name__ == "__main__":
    ghost_wiretap()