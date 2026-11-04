import os, re

files = ['03-mis-alimentos', '04-registrar-alimento', '05-alertas', '06-recetas', '07-detalle-receta', '08-estadisticas']
for f in files:
    path = f'C:/Users/jhmra/OneDrive/Desktop/tarea/{f}/index.html'
    try:
        with open(path, 'r', encoding='utf-8') as file:
            html = file.read()
    except Exception as e:
        continue
    
    if 'btn-back-mobile' in html:
        continue
        
    new_html = re.sub(
        r'(<header class="page-header">\s*)<div>',
        r'\1<div class="ph-left">\n        <button class="btn-back-mobile" onclick="history.back()" aria-label="Volver">\n          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="15 18 9 12 15 6"></polyline></svg>\n        </button>\n        <div>',
        html,
        count=1
    )
    
    with open(path, 'w', encoding='utf-8') as file:
        file.write(new_html)
print('Done adding buttons')
