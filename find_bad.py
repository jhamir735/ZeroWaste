import os
import re
import json

dir_path = r"c:\Users\jhmra\OneDrive\Desktop\tarea"
bad_words = set()

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith((".html", ".css", ".js")):
            with open(os.path.join(root, file), "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                words = content.split()
                for w in words:
                    if u'\ufffd' in w or 'Ã' in w:
                        cleaned = re.sub(r'[^a-zA-Z\ufffdÃ¡©­³º±¿¡]', '', w)
                        if cleaned:
                            bad_words.add(cleaned)

with open(r"c:\Users\jhmra\OneDrive\Desktop\tarea\bad_words.json", "w", encoding="utf-8") as f:
    json.dump(list(sorted(bad_words)), f, ensure_ascii=False, indent=2)
