import os

def split_csv(source_filepath, dest_folder, chunk_size=50 * 1024 * 1024):
    if not os.path.exists(dest_folder):
        os.makedirs(dest_folder)
    
    file_number = 1
    # Use latin-1 to handle special characters without crashing
    with open(source_filepath, 'r', encoding='latin-1') as f:
        header = f.readline()
        while True:
            chunk_name = f"ons_bridge_part_{file_number}.csv"
            chunk_path = os.path.join(dest_folder, chunk_name)
            
            current_chunk_size = 0
            with open(chunk_path, 'w', encoding='latin-1') as chunk_file:
                chunk_file.write(header)
                while current_chunk_size < chunk_size:
                    line = f.readline()
                    if not line:
                        break
                    chunk_file.write(line)
                    current_chunk_size += len(line.encode('latin-1'))
            
            print(f"Created: {chunk_name}")
            if not line:
                break
            file_number += 1

# Updated path to match your desktop setup
source = os.path.expanduser("~/Desktop/water-data-audit/PCD_OA21_LSOA21_MSOA21_LAD_NOV24_UK_LU.csv")
destination = os.path.expanduser("~/Desktop/water-data-audit/ONS_CHUNKS")

split_csv(source, destination)