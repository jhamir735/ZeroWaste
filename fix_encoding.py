import os

dir_path = r"c:\Users\jhmra\OneDrive\Desktop\tarea"
for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith((".html", ".css", ".js")):
            file_path = os.path.join(root, file)
            # Read with utf-8-sig to automatically consume the BOM if present
            with open(file_path, "r", encoding="utf-8-sig", errors="ignore") as f:
                content = f.read()
            
            if 'Ã' in content or u'\ufffd' in content:
                try:
                    # Some characters might be irreversibly lost (replaced by ?) if they weren't valid CP1252
                    # We will encode with 'ignore' or 'replace' just in case there are unmappable chars
                    fixed_content = content.encode('cp1252', errors='ignore').decode('utf-8', errors='ignore')
                    
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(fixed_content)
                    print(f"Fixed encoding for {file_path}")
                except Exception as e:
                    print(f"Could not automatically fix {file_path}: {e}")
