# ZeroWaste - Plataforma Web para la Gestion y Reduccion del Desperdicio de Alimentos

Aplicacion web integral orientada al control inteligente de despensas, gestion de fechas de vencimiento, recetas personalizadas segun stock disponible, escaneo de codigos de barra y generacion de reportes de impacto ecologico y economico.

Despliegue en produccion:
https://zerowaste-2.onrender.com

---

## Enlace Oficial de la Aplicacion

- URL en Produccion (Render): https://zerowaste-2.onrender.com
- Repositorio en GitHub: https://github.com/jhamir735/ZeroWaste.git
- Desarrollador / Contacto: Jhamir (jhmralexander@gmail.com)

---

## Modulos y Funcionalidades Principales

1. Autenticacion y Seguridad
   - Registro de usuarios e inicio de sesion con token y validacion de credenciales.
   - Perfil de usuario con sesion persistente en almacenamiento local y cierre de sesion seguro.

2. Gestion de Inventario (Mis Alimentos)
   - Visualizacion de alimentos clasificados por categorias (Frutas y verduras, Lacteos, Cereales, Carnes, etc.).
   - Filtrado por estados: Por vencer, En buen estado y Vencidos.
   - Ajuste rapido de cantidades (stepper interactivo) y eliminacion de stock.
   - Busqueda por texto predictiva y dinamica.

3. Escaner de Codigos de Barra
   - Escaneo activo mediante camara movil o web utilizando ZXing y la API BarcodeDetector del navegador.
   - Deteccion automatica y autocarga de nombre y categoria al registrar alimentos.
   - Subida manual o captura de foto del alimento.

4. Sistema Inteligente de Alertas
   - Clasificacion por urgencia: Prioridad alta (vencen hoy o en 1-3 dias), Prioridad media y Normal.
   - Notificaciones contextuales para prevenir el descarte innecesario.

5. Recetario y Aprovechamiento de Alimentos
   - Sugerencias automaticas de recetas segun los ingredientes disponibles en la despensa del usuario.
   - Calculo de porcentaje de coincidencia de ingredientes.
   - Descuento automatico de insumos al cocinar la receta, transfiriendo las porciones consumidas al historial.

6. Historial de Consumo y Reposicion Rapida
   - Registro permanente de alimentos consumidos y fechas de aprovechamiento.
   - Boton de reincorporacion directa a la despensa con un solo clic.

7. Metricas, Estadisticas y Reportes
   - Indicadores de alimentos aprovechados, porcentaje de ahorro mensual estimado y huella de carbono evitada.
   - Exportacion de inventario y reportes consolidados en formatos PDF y Excel.

8. Diseno Responsivo y Adaptabilidad Movil
   - Interfaz optimizada para dispositivos moviles, tabletas y computadoras de escritorio.
   - Navegacion inferior para celulares y panel lateral para pantallas amplias.

---

## Arquitectura del Proyecto

El sistema se compone de una arquitectura desacoplada en tres capas:

1. Capa Frontend:
   - Tecnologias: HTML5 semantico, CSS3 modular (Variables CSS, Flexbox, CSS Grid), JavaScript (Vanilla ES6+).
   - Componentes compartidos: layout.css, store.js, tutorial.js.
   - Vistas estructuradas por carpetas independientes (01-bienvenida a 10-historial).

2. Capa Backend:
   - Entorno: Node.js con framework Express.
   - Controladores modulares por entidad (auth, alimentos, recetas, historial, reportes, productos, usuario).
   - Middleware de CORS, parsing JSON de alta capacidad y proteccion de cabeceras.

3. Capa de Base de Datos:
   - Motor: PostgreSQL alojado en la nube a traves de Neon Tech.
   - Pool de conexiones concurrente (pg Pool) con soporte SSL y reconexion automatica.
   - Modo fallback / demo local para ejecucion sin conexion remota.

---

## Estructura de Carpetas

```text
ZeroWaste/
|-- 01-bienvenida/          # Pantalla de acceso, inicio de sesion y registro
|-- 02-inicio/              # Panel principal y resumen de alertas
|-- 03-mis-alimentos/       # Catalogo y gestion de la despensa
|-- 04-registrar-alimento/  # Formulario de alta de insumos
|-- 05-alertas/             # Vista detallada de alimentos proximos a vencer
|-- 06-recetas/             # Listado de recetas sugeridas
|-- 07-detalle-receta/      # Preparacion paso a paso y coccion interactiva
|-- 08-estadisticas/        # Analitica de ahorro e impacto ambiental
|-- 09-escanear/            # Lector de codigos de barra por camara
|-- 10-historial/           # Historial de consumos y reposicion
|-- backend/
|   |-- config/             # Configuracion de base de datos (db.js)
|   |-- controllers/        # Controladores de la logica de negocio
|   |-- routes/             # Definicion de endpoints REST
|   |-- services/           # Servicios de cache y autenticacion
|   |-- server.js           # Servidor principal de Express
|   `-- demo-server.js      # Servidor autonomo para pruebas locales
|-- shared/                 # Estilos globales, modales, cliente API y tutorial
`-- package.json            # Scripts de arranque y dependencias del proyecto
```

---

## Endpoints de la API REST

### Autenticacion
- POST /api/auth/register : Registro de nuevo usuario
- POST /api/auth/login    : Autenticacion y generacion de sesion
- GET  /api/auth/me       : Consulta de datos del usuario autenticado

### Alimentos e Inventario
- GET    /api/alimentos       : Listar alimentos del usuario
- POST   /api/alimentos       : Registrar nuevo alimento
- PUT    /api/alimentos/:id   : Actualizar datos o cantidad
- DELETE /api/alimentos/:id   : Eliminar alimento de la despensa

### Recetas
- GET  /api/recetas             : Obtener recetas y sugerencias segun stock
- GET  /api/recetas/:id         : Obtener detalle completo de una receta
- POST /api/recetas/:id/cocinar : Marcar receta como cocinada y descontar alimentos

### Historial y Reportes
- GET  /api/historial             : Listar historial de consumo
- POST /api/historial/reponer/:id : Reincorporar alimento consumido a la despensa
- GET  /api/reportes/resumen      : Indicadores estadisticos agregados
- GET  /api/reportes/exportar/pdf : Generar archivo PDF descargable
- GET  /api/reportes/exportar/csv : Generar archivo CSV descargable

---

## Instalacion y Ejecucion Local

### Requisitos Previos
- Node.js version 18 o superior instalada.
- Gestor de paquetes npm.
- Acceso a Internet para conectar con la base de datos de Neon o PostgreSQL local.

### Pasos de Instalacion

1. Clonar el repositorio:
```bash
git clone https://github.com/jhamir735/ZeroWaste.git
cd ZeroWaste
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
Crear un archivo `.env` en la carpeta `backend/` con el siguiente contenido:
```env
PORT=3000
DATABASE_URL=tu_cadena_de_conexion_postgresql_neon
NODE_ENV=development
```

4. Iniciar la aplicacion:
```bash
npm start
```

5. Abrir la aplicacion en el navegador:
Ingresar a: http://localhost:3000/01-bienvenida/index.html

---

## Despliegue en la Nube (Render)

1. Crear un Web Service en Render vinculado al repositorio de GitHub:
   - Repositorio: https://github.com/jhamir735/ZeroWaste.git
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start

2. Definir la variable de entorno en la pestaña Environment de Render:
   - Key: DATABASE_URL
   - Value: URL de conexion de Neon PostgreSQL con sslmode=require

3. Acceder al enlace generado por Render:
   https://zerowaste-2.onrender.com

---

## Licencia y Creditos

Proyecto desarrollado por Jhamir Alexander (jhmralexander@gmail.com).
Todos los derechos reservados - ZeroWaste 2026.
