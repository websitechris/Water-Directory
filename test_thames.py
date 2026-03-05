import requests

# We will test both the raw number and the "Z" prefix
test_codes = ["0058", "Z0058"]

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "*/*"
}

print("🚪 Testing if the API accepts sequential Feature Codes...\n")

for code in test_codes:
    url = f"https://water-quality-api.prod.p.webapp.thameswater.co.uk/water-quality-api/Zone/{code}"
    response = requests.get(url, headers=headers)
    
    print(f"Testing Code: {code}")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200 and "%PDF" in response.text[:10]:
        print("✅ SUCCESS! The server accepts this format and built the PDF!\n")
    else:
        print("❌ FAILED. It doesn't like this format.\n")