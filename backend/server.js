/* =============================================
   ZeroWaste – Servidor Backend Principal
   Archivo: backend/server.js
   ============================================= */
'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const CacheService = require('./services/cache.service');
const { runMigration } = require('./migrate_auth');

// Rutas
const authRoutes      = require('./routes/auth.routes');
const alimentosRoutes = require('./routes/alimentos.routes');
const recetasRoutes   = require('./routes/recetas.routes');
const usuarioRoutes   = require('./routes/usuario.routes');
const historialRoutes = require('./routes/historial.routes');
const reportesRoutes  = require('./routes/reportes.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
  res.header('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: '20mb' })); // Soporta fotos en Base64
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Logging de peticiones con detalle
app.use((req, res, next) => {
  const ahora = new Date().toLocaleTimeString();
  console.log(`[${ahora}] ${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    if (req.body && Object.keys(req.body).length > 0) {
      const summary = req.body.nombre ? `(Alimento: "${req.body.nombre}")` : '';
      console.log(`       Payload ${summary}`);
    }
  }
  next();
});

// Endpoint de verificación de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ZeroWaste API',
    database: 'PostgreSQL Neon Cloud',
    timestamp: new Date().toISOString()
  });
});

// Montar Rutas de la API
app.use('/api/auth',      authRoutes);
app.use('/api/alimentos', alimentosRoutes);
app.use('/api/recetas',   recetasRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/reportes',  reportesRoutes);
app.use('/api',           usuarioRoutes);

// Servir frontend estático sin caché en desarrollo para evitar scripts desactualizados en navegador
const frontendRoot = path.join(__dirname, '..');
app.use(express.static(frontendRoot, {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// Redirección raíz a la página de bienvenida
app.get('/', (req, res) => {
  res.redirect('/01-bienvenida/index.html');
});

// Manejador de rutas no encontradas (404)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta API no encontrada: ${req.originalUrl}`
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('💥 Error global no capturado:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno en el servidor',
    error: err.message
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`🚀 Servidor ZeroWaste escuchando en: http://localhost:${PORT}`);
  console.log(`🌐 Acceso a la aplicación:          http://localhost:${PORT}/01-bienvenida/index.html`);
  console.log(`📡 Endpoints API disponibles en:     http://localhost:${PORT}/api/`);
  console.log('====================================================');

  // Probar conexión a PostgreSQL
  const connected = await db.testConnection();

  // Migración idempotente: login, contraseñas e historial de consumo
  if (connected) {
    try {
      await runMigration({ silent: true });
      console.log('🔐 Esquema de autenticación e historial verificado.');
    } catch (migrationError) {
      console.warn('⚠️  No se pudo verificar el esquema de autenticación:', migrationError.message);
    }
  }

  // Limpieza inicial de caché expirada al arrancar
  try {
    await CacheService.cleanExpiredCache();
    console.log('🗑️  Caché de recetas: registros expirados eliminados al arrancar.');
  } catch (e) {
    console.warn('Advertencia al limpiar caché inicial:', e.message);
  }

  // Limpieza automática de caché expirada cada hora
  const ONE_HOUR_MS = 60 * 60 * 1000;
  setInterval(async () => {
    try {
      await CacheService.cleanExpiredCache();
      console.log(`[${new Date().toLocaleTimeString()}] 🗑️  Caché de recetas: limpieza automática completada.`);
    } catch (e) {
      console.warn('Error en limpieza automática de caché:', e.message);
    }
  }, ONE_HOUR_MS);
});

