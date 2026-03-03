import os
import csv

# Define paths
source_file = os.path.expanduser("~/Desktop/water-data-audit/Storm_Overflow_EDM_Annual_Returns_2024_630113283833794831.csv")
clean_file = os.path.expanduser("~/Desktop/water-data-audit/CLEAN_SEWAGE_DATA.csv")

print("Cleaning Rivers Trust data...")

with open(source_file, 'r', encoding='latin-1') as infile, \
     open(clean_file, 'w', newline='', encoding='latin-1') as outfile:
    
    reader = csv.reader(infile)
    writer = csv.writer(outfile)
    
    # Grab headers
    headers = next(reader)
    writer.writerow(headers)
    expected_length = len(headers)
    
    # Process rows
    row_count = 1
    kept_count = 0
    for row in reader:
        row_count += 1
        if len(row) == expected_length:
            writer.writerow(row)
            kept_count += 1
        else:
            print(f"Removed broken Row {row_count}: Had {len(row)} columns instead of {expected_length}")

print(f"Success! Cleaned file saved to your folder. Kept {kept_count} perfect rows.")