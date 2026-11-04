import os, re

# 1. Update layout.css
css_path = 'C:/Users/jhmra/OneDrive/Desktop/tarea/shared/layout.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

if '.btn-back-mobile' not in css:
    css += '''
/* Mobile Back Button */
.btn-back-mobile {
  display: none;
  background: var(--bg);
  border: 1px solid rgba(0,0,0,0.05);
  color: var(--text-main);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}
.ph-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
@media (max-width: 768px) {
  .btn-back-mobile { display: flex; }
}
'''
    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(css)

# 2. Update HTML files
files = ['03-mis-alimentos', '04-registrar-alimento', '05-alertas', '06-recetas', '07-detalle-receta', '08-estadisticas']
for f in files:
    path = f'C:/Users/jhmra/OneDrive/Desktop/tarea/{f}/index.html'
    try:
        with open(path, 'r', encoding='utf-8') as file:
            html = file.read()
    except Exception as e:
        print('Error reading', path)
        continue
    
    # Check if already added
    if 'btn-back-mobile' in html:
        continue
        
    # Replace the div wrapping the title
    # It looks like:
    # <header class="page-header">
    #   <div>
    
    new_html = re.sub(
        r'(<header class="page-header">\s*)<div>',
        r'\1<div class="ph-left">\n        <button class="btn-back-mobile" onclick="history.back()" aria-label="Volver atrás">\n          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="15 18 9 12 15 6"></polyline></svg>\n        </button>\n        <div>',
        html,
        count=1
    )
    
    # Improve some global card aesthetics slightly
    # add subtle shadow improvements if we want, but doing it in CSS is better.
    
    with open(path, 'w', encoding='utf-8') as file:
        file.write(new_html)

print('Back button added!')
