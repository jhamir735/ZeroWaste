/* =============================================
   ZeroWaste – PostgreSQL Database Connection
   Archivo: backend/config/db.js
   Soporte para Neon (Cloud) y PostgreSQL Local
   ============================================= */
'use strict';

const path = require('path');
const { Pool } = require('pg');

// Cargar .env desde la carpeta backend o la raíz
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config(); // Por si se ejecuta directamente desde backend

const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URI || '';
const connectionString = rawUrl.trim().replace(/^["']|["']$/g, '');

if (connectionString) {
  console.log('📌 Usando cadena de conexión a Neon/PostgreSQL Cloud');
} else {
  console.warn('⚠️ ALERTA: No se detectó DATABASE_URL en las variables de entorno.');
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    console.error('❌ ERROR CRÍTICO EN RENDER: Debes agregar la variable de entorno DATABASE_URL en el panel de Render.');
  } else {
    console.log('📌 Usando variables locales por defecto (DB_USER/DB_HOST)');
  }
}

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Requerido para Neon
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME     || 'zerowaste_db',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
});

async function testConnection () {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() AS ahora, current_database() AS bd');
    client.release();
    console.log(`✅ Conexión exitosa a PostgreSQL (Neon): BD [${res.rows[0].bd}]`);
    return true;
  } catch (err) {
    console.error('⚠️  No se pudo conectar a PostgreSQL.');
    console.error(`   Causa: ${err.message}`);
    return false;
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  testConnection,
};
