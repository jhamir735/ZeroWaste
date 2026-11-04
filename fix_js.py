import re
path = 'C:/Users/jhmra/OneDrive/Desktop/tarea/02-inicio/script.js'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

text = re.sub(r'if \(greetEl\) greetEl\.textContent = saludo \+ '', '' \+ firstName \+ ''.*?'';', 'if (greetEl) greetEl.textContent = saludo + '', '' + firstName;', text)
text = re.sub(r'alertList\.innerHTML = ''<li.*?</li>'';', 'alertList.innerHTML = ''<li style=\"text-align:center;color:var(--text-sec);padding:16px;font-size:13px;\">?? ¡Ningún alimento urgente!</li>'';', text)
text = text.replace('mos', 'más')
text = text.replace('fra', 'fría')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
