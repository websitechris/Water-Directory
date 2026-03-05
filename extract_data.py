import os
import csv
import pdfplumber

def build_database():
    print("🛢️ Booting up the PDF Refinery...")
    
    pdf_folder = "Thames_Water_Reports"
    output_csv = "thames_chemical_database.csv"
    
    # The specific chemicals we want to track for our database
    targets = [
        "Lead as Pb", 
        "Fluoride as F", 
        "Chlorine (Residual)", 
        "Nitrate as NO3", 
        "Hardness (Total) as CaCO3"
    ]
    
    # Create our final, polished database spreadsheet
    with open(output_csv, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["Zone Name", "Chemical", "Unit", "Min | Mean | Max Results"])
        
        # Loop through every PDF you just downloaded
        for filename in os.listdir(pdf_folder):
            if filename.endswith(".pdf"):
                # Clean up the file name to get the actual Zone name
                zone_name = filename.replace("WQ_Report_", "").replace(".pdf", "")
                print(f"\n🔬 Analyzing: {zone_name}...")
                
                filepath = os.path.join(pdf_folder, filename)
                
                # Crack open the PDF
                with pdfplumber.open(filepath) as pdf:
                    for page in pdf.pages:
                        # Extract all the tables on the page
                        tables = page.extract_tables()
                        for table in tables:
                            for row in table:
                                # Skip empty rows or header rows
                                if not row or not row[0]:
                                    continue
                                    
                                chemical_name = str(row[0]).strip()
                                
                                # If the row matches one of our target chemicals, extract it!
                                for target in targets:
                                    if target in chemical_name:
                                        try:
                                            # Column 1 is the unit (e.g., mg/l)
                                            unit = str(row[1]).replace("\n", "").strip()
                                            
                                            # Column 3 contains the Min, Mean, and Max values. 
                                            # They are usually separated by invisible newlines, so we replace them with ' | '
                                            raw_values = str(row[3]).replace("\n", " | ").strip()
                                            
                                            writer.writerow([zone_name, target, unit, raw_values])
                                            print(f"   💧 Found {target}: {raw_values} {unit}")
                                        except IndexError:
                                            pass

    print(f"\n✅ DATABASE BUILT! Open '{output_csv}' to see your final data.")

if __name__ == "__main__":
    build_database()