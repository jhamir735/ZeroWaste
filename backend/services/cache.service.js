/* =============================================
   ZeroWaste – Cache Service para Recetas
   Archivo: backend/services/cache.service.js
   Almacenamiento temporal en Neon con expiración de 24 horas
   ============================================= */
'use strict';

const db = require('../config/db');

class CacheService {
  /**
   * Limpia registros de caché cuya fecha de expiración haya pasado
   */
  static async cleanExpiredCache () {
    try {
      const res = await db.query(
        'DELETE FROM recetas_cache WHERE expira_en < CURRENT_TIMESTAMP RETURNING id'
      );
      if (res.rowCount > 0) {
        console.log(`🧹 Caché de recetas limpiado: ${res.rowCount} recetas expiradas eliminadas.`);
      }
      return res.rowCount;
    } catch (err) {
      console.warn('Advertencia al limpiar recetas_cache:', err.message);
      return 0;
    }
  }

  /**
   * Obtiene recetas en caché para un hash de búsqueda determinado
   */
  static async getBySearchHash (searchHash) {
    try {
      await this.cleanExpiredCache();
      const { rows } = await db.query(
        `SELECT * FROM recetas_cache 
         WHERE hash_busqueda = $1 AND expira_en >= CURRENT_TIMESTAMP
         ORDER BY id DESC LIMIT 50`,
        [searchHash]
      );
      return rows;
    } catch (err) {
      console.warn('Error al consultar recetas_cache por hash:', err.message);
      return [];
    }
  }

  /**
   * Obtiene una receta por su origen y su id externo
   */
  static async getByExternalId (origen, externalId) {
    try {
      const { rows } = await db.query(
        `SELECT * FROM recetas_cache 
         WHERE origen = $1 AND receta_id_externo = $2 AND expira_en >= CURRENT_TIMESTAMP
         LIMIT 1`,
        [origen, String(externalId)]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.warn('Error al buscar receta en caché por externalId:', err.message);
      return null;
    }
  }

  /**
   * Guarda una lista de recetas en la tabla recetas_cache evitando duplicados
   */
  static async saveMultiple (recetas, searchHash = null) {
    if (!Array.isArray(recetas) || recetas.length === 0) return [];
    const saved = [];

    for (const r of recetas) {
      try {
        const query = `
          INSERT INTO recetas_cache (
            receta_id_externo, origen, hash_busqueda, nombre, imagen, 
            tiempo, porciones, dificultad, categoria, area, texto_ahorro,
            ingredientes, pasos, es_ia, expira_en
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP + INTERVAL '24 hours')
          ON CONFLICT (origen, receta_id_externo) 
          DO UPDATE SET 
            expira_en = CURRENT_TIMESTAMP + INTERVAL '24 hours',
            hash_busqueda = COALESCE(EXCLUDED.hash_busqueda, recetas_cache.hash_busqueda)
          RETURNING *;
        `;

        const values = [
          String(r.receta_id_externo || r.id),
          r.origen || 'themealdb',
          searchHash,
          r.nombre,
          r.imagen || null,
          r.tiempo || '25 min',
          r.porciones || '2-3 porciones',
          r.dificultad || 'Media',
          r.categoria || 'General',
          r.area || 'Internacional',
          r.texto_ahorro || '',
          JSON.stringify(r.ingredientes || []),
          JSON.stringify(r.pasos || []),
          Boolean(r.es_ia)
        ];

        const { rows } = await db.query(query, values);
        if (rows.length > 0) saved.push(rows[0]);
      } catch (err) {
        console.warn(`No se pudo cachear receta "${r.nombre}":`, err.message);
      }
    }

    return saved;
  }
}

module.exports = CacheService;

