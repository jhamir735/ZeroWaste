/* =============================================
   ZeroWaste – Inicialización de Tabla de Caché Temporal en Neon
   Archivo: backend/init_cache_table.js
   ============================================= */
'use strict';

const db = require('./config/db');

async function initCacheTable () {
  try {
    console.log('📌 Creando tabla recetas_cache en Neon si no existe...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS recetas_cache (
        id SERIAL PRIMARY KEY,
        receta_id_externo VARCHAR(100) NOT NULL,
        origen VARCHAR(50) NOT NULL, -- 'themealdb', 'spoonacular', 'peruana', 'ia'
        hash_busqueda VARCHAR(64),
        nombre VARCHAR(200) NOT NULL,
        imagen TEXT,
        tiempo VARCHAR(50) DEFAULT '25 min',
        porciones VARCHAR(50) DEFAULT '2-3 porciones',
        dificultad VARCHAR(50) DEFAULT 'Media',
        categoria VARCHAR(100) DEFAULT 'General',
        area VARCHAR(100) DEFAULT 'Internacional',
        texto_ahorro TEXT,
        ingredientes JSONB NOT NULL DEFAULT '[]'::jsonb,
        pasos JSONB NOT NULL DEFAULT '[]'::jsonb,
        es_ia BOOLEAN DEFAULT FALSE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expira_en TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
        CONSTRAINT uq_receta_cache UNIQUE(origen, receta_id_externo)
      );

      CREATE INDEX IF NOT EXISTS idx_recetas_cache_expira ON recetas_cache(expira_en);
      CREATE INDEX IF NOT EXISTS idx_recetas_cache_hash ON recetas_cache(hash_busqueda);
    `);

    console.log('✅ Tabla recetas_cache lista y verificada en Neon.');

    // Probar limpieza de expirados
    const resClean = await db.query('DELETE FROM recetas_cache WHERE expira_en < CURRENT_TIMESTAMP RETURNING id');
    console.log(`🧹 Limpieza inicial de caché ejecutada: ${resClean.rowCount} registros expirados eliminados.`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al inicializar recetas_cache en Neon:', err);
    process.exit(1);
  }
}

initCacheTable();

