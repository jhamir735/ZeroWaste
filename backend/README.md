# 🥑 ZeroWaste – Backend API REST (Node.js + Express + PostgreSQL)

Backend desarrollado con arquitectura limpia para la aplicación **ZeroWaste**, utilizando **Node.js**, **Express** y **PostgreSQL local**.

---

## 📁 Estructura del Backend

```text
backend/
├── config/
│   └── db.js                      # Configuración y Pool de conexiones con PostgreSQL (pg)
├── controllers/
│   ├── alimentos.controller.js    # Lógica de alimentos (listar, crear, actualizar, eliminar, alertas)
│   ├── recetas.controller.js      # Lógica de recetas, favoritos y marcar como cocinada
│   └── usuario.controller.js      # Perfil de usuario y estadísticas dinámicas
├── routes/
│   ├── alimentos.routes.js        # Rutas /api/alimentos
│   ├── recetas.routes.js          # Rutas /api/recetas
│   └── usuario.routes.js          # Rutas /api/usuario y /api/estadisticas
├── database.sql                   # Script SQL completo (Tablas + Datos iniciales)
├── server.js                      # Servidor Express principal
├── package.json                   # Dependencias del proyecto
├── .env                           # Variables de entorno y credenciales locales
└── .env.example                   # Plantilla de variables de entorno
```

---

## 🛠️ Requisitos Previos

1. **Node.js** (v18 o superior) instalado.
2. **PostgreSQL** instalado en tu computadora (con pgAdmin 4 o terminal psql).

---

## 🚀 Paso a Paso para Iniciar el Backend

### Paso 1: Crear la Base de Datos en PostgreSQL

1. Abre **pgAdmin 4** (o la consola `psql`).
2. En el panel izquierdo, haz clic derecho en **Databases** → **Create** → **Database...**
3. Nómbrala: `zerowaste_db` y guarda.
4. Abre la herramienta de consultas (**Query Tool**) seleccionando `zerowaste_db`.
5. Abre y ejecuta todo el contenido del archivo [`database.sql`](database.sql).
   *(Esto creará automáticamente las tablas `usuarios`, `alimentos`, `recetas`, `favoritos` y `recetas_cocinadas` junto con datos de prueba).*

---

### Paso 2: Configurar tu Contraseña en el archivo `.env`

Abre el archivo `backend/.env` y asegúrate de que coincida con tu instalación de PostgreSQL:

```env
PORT=3000
DB_USER=postgres
DB_PASSWORD=tu_contraseña_aqui
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zerowaste_db
```

> **Nota:** Cambia `tu_contraseña_aqui` por la contraseña que le pusiste al usuario `postgres` durante la instalación.

---

### Paso 3: Instalar Dependencias y Arrancar

Abre una terminal en la carpeta `backend` y ejecuta:

```bash
# 1. Instalar dependencias (express, pg, cors, dotenv)
npm install

# 2. Iniciar el servidor
npm start
```

Verás un mensaje como este en la consola:
```text
====================================================
🚀 Servidor ZeroWaste escuchando en: http://localhost:3000
🌐 Acceso a la aplicación:          http://localhost:3000/01-bienvenida/index.html
📡 Endpoints API disponibles en:     http://localhost:3000/api/
====================================================
✅ Conexión exitosa a PostgreSQL: BD [zerowaste_db]
```

---

## 📡 Endpoints de la API REST

### 🥗 Alimentos (`/api/alimentos`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/alimentos` | Obtiene todos los alimentos ordenados por días para vencer |
| `GET` | `/api/alimentos/alertas` | Obtiene solo los alimentos que vencen en 3 días o menos |
| `GET` | `/api/alimentos/:id` | Obtiene el detalle de un alimento por ID |
| `POST` | `/api/alimentos` | Registra un nuevo alimento (nombre, categoría, cantidad, ubicación, fecha, foto) |
| `PUT` | `/api/alimentos/:id` | Modifica los datos de un alimento existente |
| `DELETE` | `/api/alimentos/:id` | Elimina un alimento del inventario |

### 📖 Recetas (`/api/recetas`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/recetas` | Obtiene el recetario completo (admite `?tab=sugeridas`, `?tab=favoritas`, `?tab=rapidas`) |
| `GET` | `/api/recetas/:id` | Obtiene el detalle de una receta con sus ingredientes y pasos |
| `POST` | `/api/recetas/:id/favorito` | Agrega o quita la receta de favoritos del usuario |
| `POST` | `/api/recetas/:id/cocinar` | Marca la receta como cocinada y descuenta los ingredientes de la despensa |

### 👤 Usuario y Estadísticas (`/api`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/usuario` | Obtiene los datos del perfil actual |
| `PUT` | `/api/usuario` | Actualiza nombre y correo del perfil |
| `GET` | `/api/estadisticas` | Calcula dinámicamente dinero ahorrado (S/), kg salvados y medallas desbloqueadas |
| `GET` | `/api/health` | Verifica el estado del servidor y la base de datos |

