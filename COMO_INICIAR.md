# 🚀 Cómo Iniciar ZeroWaste

## 🧪 ¿No tienes PostgreSQL o no eres dueño del backend?

Usa el **modo demo**, que no necesita base de datos:

```bash
npm run demo
```

O haz doble clic en **`iniciar_demo.bat`**.

- Sirve la misma aplicación y las mismas rutas API.
- Guarda todo en `backend/demo-data.json` (se crea automáticamente).
- Incluye usuario, alimentos, historial, estadísticas y reportes de ejemplo.
- Acceso: `maria@correo.com` (o `maria`) / `zerowaste123`
- Para borrar los datos y empezar de nuevo: `npm run demo:reset`

> Si ya tienes PostgreSQL/Neon configurado, usa el modo normal con `iniciar_servidor.bat` o `npm start`.

---

## ✅ Opción Fácil — Doble clic con PostgreSQL
Ejecuta el archivo **`iniciar_servidor.bat`** que está en la raíz del proyecto.  
Eso levanta el backend automáticamente (requiere PostgreSQL/Neon disponible).

---

## 🛠️ Opción Manual (terminal)

### 📌 Primera vez (solo una vez)

```bash
# 1. Entra a la carpeta backend
cd backend

# 2. Instala las dependencias
npm install

# 3. Crea tu archivo de variables de entorno
copy .env.example .env
# → Luego abre .env y pon tus credenciales reales de Neon PostgreSQL

# 4. Inicializa la base de datos (incluye usuarios con contraseña e historial)
node init_db.js
node init_cache_table.js

# 5. Si ya tenías una base de datos creada, aplica la migración de login:
node migrate_auth.js
```

> 🔐 **Acceso demo:** `maria@correo.com` / `zerowaste123`
> También puedes entrar con el usuario `maria` y la misma contraseña.
> Puedes crear más cuentas desde el botón **Crear una cuenta nueva**.

---

### ▶️ Cada vez que quieras usar la app

```bash
# Desde la raíz del proyecto:
cd backend
node server.js
```

El servidor se levanta en: **http://localhost:3000**

---

### 🌐 Abrir el frontend

Después de levantar el backend, abre en tu navegador:

```
01-bienvenida/index.html
```

O haz doble clic en ese archivo desde el explorador.

---

## 🔑 Variables de entorno requeridas (`.env`)

Copia `.env.example` como `.env` y completa estos valores:

```env
DATABASE_URL=postgresql://usuario:contraseña@host/zerowaste
PORT=3000
AUTH_SECRET=un-secreto-largo-y-dificil-de-adivinar
```

> ⚠️ **NUNCA** subas el archivo `.env` a GitHub. Ya está protegido en `.gitignore`.

---

## 📁 Estructura del proyecto

```
tarea/
├── 01-bienvenida/        → Pantalla de bienvenida
├── 02-inicio/            → Dashboard principal
├── 03-mis-alimentos/     → Gestión de despensa
├── 04-registrar-alimento/→ Agregar alimentos
├── 05-alertas/           → Alertas de vencimiento
├── 06-recetas/           → Recetas con ingredientes disponibles
├── 07-detalle-receta/    → Detalle y preparación de receta
├── 08-estadisticas/      → Estadísticas, historial y reportes PDF/Excel
├── 09-escanear/          → Escáner de códigos de barras (cámara del celular)
├── backend/              → Servidor Node.js + PostgreSQL Neon
├── shared/               → Estilos y store compartidos
├── iniciar_servidor.bat  → Atajo para arrancar el backend
└── COMO_INICIAR.md       → Este archivo 📄
```


---

## 📖 Tutorial integrado

En todas las pantallas hay un botón **Tutorial** abajo a la izquierda. Al pulsarlo se abre una guía paso a paso para principiantes, con capturas de cada pantalla y marcas numeradas.

- Se abre directamente en el paso de la pantalla donde estás.
- Se navega con **Anterior / Siguiente**, con las flechas del teclado o eligiendo un paso a la izquierda. Se cierra con **✕** o **Esc**.
- Archivos: `shared/tutorial.js` (contenido y lógica), `shared/tutorial.css` (estilos) y `shared/tutorial/` (capturas y posición de las marcas).
- Para editar los textos, abre `shared/tutorial.js` y modifica el arreglo `PASOS`.
- Para agregarlo a una página nueva, añade `<link rel="stylesheet" href="../shared/tutorial.css"/>` en el `<head>` y `<script src="../shared/tutorial.js"></script>` antes de `</body>`.


---

## 📷 Escanear productos con el celular

Pantalla `09-escanear`. Se llega con el botón **Escanear** en *Inicio* y *Mis alimentos*, o con el banner de *Registrar alimento*.

**Cómo funciona**
1. Pulsa **Activar cámara** (en el celular usa la cámara trasera) y apunta al código de barras.
2. Al reconocerlo suena un pitido y el producto aparece en la lista con nombre, categoría, ubicación y una fecha de vencimiento sugerida.
3. Edita lo que haga falta (cantidad, fecha, atajos +3 días / +1 semana / +1 mes) y pulsa **Guardar todo**. Se agregan a *Mis alimentos*.
- Si escaneas el mismo código otra vez, sube la cantidad.
- Si el producto no existe en las bases de datos, queda en amarillo para que escribas el nombre y la categoría.
- La lista se conserva si recargas la página (hasta cerrar la pestaña).

**Alternativas si la cámara no se activa**: botón **Tomar foto del código** o escribir el número a mano (8, 12, 13 o 14 dígitos).

**⚠️ Requisito de la cámara en vivo: HTTPS o localhost.** Los navegadores solo permiten la cámara en `https://` o en `localhost`. Si abres el servidor desde el celular con `http://192.168.x.x:3000` la cámara no se activará; opciones:
- Publicar la app con HTTPS (Render, Railway, Vercel, etc.).
- Un túnel temporal con HTTPS, por ejemplo `npx localtunnel --port 3000` o `ngrok http 3000`.
- Usar **Tomar foto del código**, que funciona sin HTTPS.

**Probar sin productos reales**: abre `09-escanear/codigos-demo.html` (22 códigos de prueba imprimibles) y escanéalos desde la pantalla de otro dispositivo o impresos.

**Base de productos**
- Primero se busca en el catálogo demo (`backend/services/productos.demo.data.js`).
- Si no está, se consulta **Open Food Facts** (gratuito, requiere internet) y se guarda en memoria 24 h.
- Sin internet, el producto queda como «desconocido» para completarlo a mano.
- Endpoint: `GET /api/productos/barcode/:codigo` (requiere sesión iniciada).
- Lectura de códigos: `BarcodeDetector` nativo (Chrome/Edge) o ZXing incluido en `09-escanear/vendor/` (sin depender de CDN).
