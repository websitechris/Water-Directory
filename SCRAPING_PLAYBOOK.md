# 📖 Data Extraction Playbook: API Heists & Web Scraping

A record of data engineering tactics for bypassing website interfaces to extract raw data. These methods range from basic API calls to advanced stealth browser wiretaps.

## 🛠 Prerequisites Installed
These are the Python libraries installed in our virtual environment `(venv)` to execute these methods:
* `pip install requests` (For making direct HTTP calls to web servers)
* `pip install pdfplumber` (For extracting tabular data from PDFs)
* `pip install playwright` (For launching robotic web browsers)
* `playwright install` (Downloads the hidden Chromium/Firefox/WebKit binaries)
* `pip install playwright-stealth` (For stripping robot fingerprints from Playwright)

---

## 🕵️ Method 1: The "Front Door" API Brute-Force
When developers build web apps, they often leave the main directory endpoints completely unlocked.
* **The Tactic:** Guess common URL paths to see if the server hands over the master list of data without asking for credentials.
* **Common Guesses:** `.../api/data`, `.../api/Zones`, `.../api/ZoneList`, `.../search?q=all`.
* **The Code:** Uses the `requests` library to send a `GET` request and check if the `status_code` is `200` (Success) or `404/403` (Locked/Not Found).
* **When to use:** Always try this first. If a small agency leaves their API unlocked, you can download their entire database in 3 seconds.

## 🗺️ Method 2: ArcGIS Web Map Interrogation
Many environmental agencies use ArcGIS to display maps. The visual map is heavy, but it is always powered by a hidden, lightweight database (FeatureServer).
* **The Tactic:** Extract the `ItemID` from the map's URL. Query the ArcGIS REST API (`.../sharing/rest/content/items/{item_id}/data?f=json`) to crack open the map.
* **The Trap:** ArcGIS often uses "GroupLayers" (ghost folders). You must write a script to loop through the folders until you find the actual `url` ending in `MapServer` or `FeatureServer`.
* **When to use:** Whenever you see an interactive data map on a government or environmental website.

## 🎧 Method 3: Network Tab Wiretapping (Manual)
When an API is hidden, you can watch the website talk to it in real-time.
* **The Tactic:** Open Chrome Developer Tools -> Network Tab. Turn on **Preserve Log** (crucial for sites that refresh). Filter by **Fetch/XHR**. 
* **The Execution:** Perform a search on the website as a normal user. Watch the Network tab for the specific data packet that flies by. Click it, view the "Headers" to get the secret Request URL, and view "Response" to see the JSON structure.

## 🤖 Method 4: The Playwright Wiretap
If a site has basic bot protection, basic Python `requests` will fail. You must use a real browser to trick the server.
* **The Tactic:** Use `playwright` to launch a visible Chromium browser. Attach an event listener (`page.on("response", capture_api_response)`) to the browser's background network.
* **The Execution:** The user manually solves the CAPTCHA/Cloudflare on the screen. Once the human passes the check and hits "Search", the Python script intercepts the raw JSON data packet the moment it hits the browser.

## 🥷 Method 5: The V2 Stealth Browser
Advanced security (like Cloudflare Turnstile) looks for the `webdriver=true` fingerprint that all automated browsers have.
* **The Tactic:** Use `playwright-stealth` (`Stealth().use_sync()`) to strip out the robot fingerprints, spoofing the hardware concurrency, webgl vendor, and user-agent to look exactly like a normal Mac or Windows computer.
* **The Reality Check:** While this defeats 95% of basic bot blockers, enterprise Cloudflare Turnstile uses deep hardware-level behavioral analytics. If Stealth V2 fails (resulting in a `412 Precondition Failed`), the web-scraping route is dead, and you must pivot to GIS Spatial mapping.

## 📄 Method 6: Direct PDF Data Extraction
Once you bypass the API and download the raw PDF reports, you need to turn them back into databases.
* **The Tactic:** Use `pdfplumber` to extract tables (`page.extract_tables()`).
* **The Execution:** Write strict logic rules (e.g., `if len(row) >= 6` and `if row[0] in exact_targets`) to skip glossary paragraphs and isolate the specific chemical rows and Mean averages.