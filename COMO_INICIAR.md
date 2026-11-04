# 🚀 Cómo Iniciar ZeroWaste

## ✅ Opción Fácil — Doble clic
Ejecuta el archivo **`iniciar_servidor.bat`** que está en la raíz del proyecto.  
Eso levanta el backend automáticamente.

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

# 4. Inicializa la base de datos
node init_db.js
node init_cache_table.js
```

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
├── 08-estadisticas/      → Estadísticas de consumo
├── backend/              → Servidor Node.js + PostgreSQL Neon
├── shared/               → Estilos y store compartidos
├── iniciar_servidor.bat  → Atajo para arrancar el backend
└── COMO_INICIAR.md       → Este archivo 📄
```

