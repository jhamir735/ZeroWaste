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
├── backend/              → Servidor Node.js + PostgreSQL Neon
├── shared/               → Estilos y store compartidos
├── iniciar_servidor.bat  → Atajo para arrancar el backend
└── COMO_INICIAR.md       → Este archivo 📄
```

