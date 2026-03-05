from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync
import json

def intercept_thames_api():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # 🥷 APPLY STEALTH MODE!
        stealth_sync(page)

        def capture_api_response(response):
            if "/waterquality" in response.url and "PostCode" in response.url:
                if response.status == 200:
                    print("\n🚨 WIRETAP TRIGGERED! Caught the hidden data!")
                    try:
                        data = response.json()
                        zone_id = data.get("mapCode")
                        print(f"🔑 SECRET ZONE ID: {zone_id}")
                    except Exception as e:
                        print(f"Error parsing data: {e}")
                else:
                    print(f"\n⚠️ API returned status: {response.status}")

        page.on("response", capture_api_response)

        print("🌐 Opening Thames Water in STEALTH MODE...")
        page.goto("https://www.thameswater.co.uk/help/water-quality/check-your-water-quality")

        print("\n🤖 BROWSER OPEN. Here is your mission:")
        print("1. Click the Cloudflare 'I am human' box if it asks.")
        print("2. Type a postcode (e.g., SW1A 1AA or RG1 8DB) into the website.")
        print("3. Click Search.")
        print("\n🎧 Listening to the network... (You have 60 seconds)")

        page.wait_for_timeout(60000)
        
        print("\nClosing wiretap.")
        browser.close()

if __name__ == "__main__":
    intercept_thames_api()