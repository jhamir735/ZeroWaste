/* =============================================
   ZeroWaste – Recetas Controller Inteligente
   Archivo: backend/controllers/recetas.controller.js
   Integración con APIs (TheMealDB), Recetas Peruanas,
   Caché temporal de 24h en Neon y Motor de IA
   ============================================= */
'use strict';

const crypto = require('crypto');
const db = require('../config/db');
const CacheService = require('../services/cache.service');
const RecipeApiService = require('../services/recipeApi.service');
const RecommendationEngine = require('../services/recommendation.engine');
const AiRecipeService = require('../services/aiRecipe.service');
const PERUVIAN_RECIPES = require('../services/peruvianRecipes.data');

// Generar hash a partir de los ingredientes disponibles
function generateSearchHash (alimentos) {
  const sortedNames = alimentos.map(a => a.nombre.toLowerCase().trim()).sort().join('|');
  return crypto.createHash('md5').update(sortedNames).digest('hex').substring(0, 16);
}

/**
 * GET /api/recetas/recomendaciones
 * Sistema inteligente de recomendaciones basado en la despensa
 */
exports.getRecomendaciones = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const filtro = req.query.filtro || 'listas'; // 'listas' por defecto: 100% en despensa sin comprar
    const busqueda = req.query.q ? req.query.q.toLowerCase().trim() : '';

    // 1. Consultar alimentos vigentes del usuario en Neon (ordenados por urgencia de vencimiento)
    const { rows: alimentos } = await db.query(`
      SELECT 
        id, 
        nombre, 
        categoria, 
        cantidad, 
        ubicacion, 
        TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
        (fecha_vencimiento - CURRENT_DATE) AS dias_restantes
      FROM alimentos 
      WHERE usuario_id = $1 AND (fecha_vencimiento - CURRENT_DATE) >= 0
      ORDER BY dias_restantes ASC, fecha_vencimiento ASC
    `, [usuarioId]);

    // 2. Limpiar registros de caché expirados (> 24h) en Neon
    await CacheService.cleanExpiredCache();

    // 3. Obtener recetas candidatas:
    // a) Recetas del catálogo base en Neon
    const { rows: recetasDb } = await db.query('SELECT * FROM recetas ORDER BY id ASC');
    const poolRecetas = [...recetasDb.map(r => ({
      ...r,
      receta_id_externo: String(r.id),
      origen: 'local'
    }))];

    // b) Recetas peruanas auténticas
    poolRecetas.push(...PERUVIAN_RECIPES);

    // c) Recetas generadas por Chef IA vigentes en caché
    try {
      const { rows: recetasIa } = await db.query(
        'SELECT * FROM recetas_cache WHERE es_ia = true AND expira_en >= CURRENT_TIMESTAMP ORDER BY id DESC LIMIT 10'
      );
      if (recetasIa.length > 0) {
        poolRecetas.push(...recetasIa);
      }
    } catch (e) {
      console.warn('Advertencia al consultar recetas IA en caché:', e.message);
    }

    // d) Consultar caché temporal en Neon para los ingredientes actuales
    const searchHash = generateSearchHash(alimentos);
    const cachedApi = await CacheService.getBySearchHash(searchHash);

    if (cachedApi.length > 0) {
      console.log(`⚡ Usando ${cachedApi.length} recetas desde caché temporal Neon (24h).`);
      poolRecetas.push(...cachedApi);
    } else if (alimentos.length > 0) {
      console.log('🌐 Consultando TheMealDB API para enriquecer recomendaciones...');
      const apiRecipes = await RecipeApiService.getCandidateRecipes(alimentos);
      if (apiRecipes.length > 0) {
        // Guardar temporalmente en Neon con caducidad de 24 horas
        await CacheService.saveMultiple(apiRecipes, searchHash);
        poolRecetas.push(...apiRecipes);
      }
    }

    // e) Si el usuario buscó por texto (ej. "pollo teriyaki"), consultar directamente TheMealDB
    if (busqueda && busqueda.length >= 3) {
      try {
        console.log(`🌐 Buscando "${busqueda}" en TheMealDB API...`);
        const searchResults = await RecipeApiService.searchFromMealDBByName(busqueda);
        if (searchResults && searchResults.length > 0) {
          poolRecetas.push(...searchResults);
        }
      } catch (err) {
        console.warn('Error en búsqueda externa TheMealDB:', err.message);
      }
    }

    // d) Eliminar duplicados por nombre u origen+id
    const seenNames = new Set();
    const recetasUnicas = [];
    for (const r of poolRecetas) {
      const normName = r.nombre.toLowerCase().trim();
      if (!seenNames.has(normName)) {
        seenNames.add(normName);
        recetasUnicas.push(r);
      }
    }

    // 4. Evaluar con el motor inteligente de recomendaciones
    const evaluadas = RecommendationEngine.evaluateRecipes(recetasUnicas, alimentos);

    // 5. Marcar si son favoritas del usuario
    const { rows: favs } = await db.query(
      'SELECT receta_id FROM favoritos WHERE usuario_id = $1',
      [usuarioId]
    );
    const favIds = new Set(favs.map(f => String(f.receta_id)));

    const conFavoritos = evaluadas.map(r => ({
      ...r,
      es_favorita: favIds.has(String(r.id)) || favIds.has(String(r.receta_id_externo))
    }));

    // 6. Aplicar filtros según solicitud
    let filtradas = conFavoritos;

    if (filtro === 'listas') {
      // 100% de ingredientes en la despensa (sin necesidad de comprar más)
      filtradas = conFavoritos.filter(r => r.puede_cocinar_ya);
    } else if (filtro === 'urgentes') {
      // Priorizan alimentos que vencen pronto (<= 3 días)
      filtradas = conFavoritos.filter(r => r.aprovecha_urgentes);
    } else if (filtro === 'ia') {
      // Generadas por inteligencia artificial
      filtradas = conFavoritos.filter(r => r.es_ia);
    } else if (filtro === 'comprar') {
      // Recetas que aprovechan parte de la despensa pero requieren comprar ingredientes adicionales
      filtradas = conFavoritos.filter(r => !r.puede_cocinar_ya);
    } else if (filtro === 'favoritas') {
      filtradas = conFavoritos.filter(r => r.es_favorita);
    } else if (filtro === 'todas') {
      // Todas las recetas que usan al menos un ingrediente de la despensa
      filtradas = conFavoritos;
    }

    if (busqueda) {
      const matchSearch = r =>
        r.nombre.toLowerCase().includes(busqueda) ||
        (r.area && r.area.toLowerCase().includes(busqueda)) ||
        (r.categoria && r.categoria.toLowerCase().includes(busqueda)) ||
        (r.ingredientes_disponibles && r.ingredientes_disponibles.some(i => i.nombre.toLowerCase().includes(busqueda))) ||
        (r.ingredientes_faltantes && r.ingredientes_faltantes.some(i => i.nombre.toLowerCase().includes(busqueda)));

      const searchMatches = conFavoritos.filter(matchSearch);

      if (filtro === 'listas') {
        // En la pestaña por defecto, si el usuario busca algo específico por nombre, mostrar todas las coincidencias
        // priorizando las listas para cocinar
        const listas = searchMatches.filter(r => r.puede_cocinar_ya);
        const comprar = searchMatches.filter(r => !r.puede_cocinar_ya);
        filtradas = [...listas, ...comprar];
      } else if (filtro === 'comprar') {
        filtradas = searchMatches.filter(r => !r.puede_cocinar_ya);
      } else {
        filtradas = searchMatches;
      }
    }

    res.json({
      success: true,
      count: filtradas.length,
      data: filtradas,
      resumen_despensa: {
        total_alimentos: alimentos.length,
        vencen_hoy: alimentos.filter(a => parseInt(a.dias_restantes, 10) <= 0).length,
        proximos_vencer: alimentos.filter(a => {
          const d = parseInt(a.dias_restantes, 10);
          return d > 0 && d <= 3;
        }).length
      }
    });

  } catch (err) {
    console.error('Error en getRecomendaciones:', err);
    res.status(500).json({ success: false, message: 'Error al generar recomendaciones de recetas', error: err.message });
  }
};

/**
 * POST /api/recetas/generar-ia
 * Genera una receta personalizada mediante IA usando la despensa del usuario
 */
exports.generarRecetaIa = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // Consultar alimentos disponibles y no vencidos
    const { rows: alimentos } = await db.query(`
      SELECT 
        id, nombre, categoria, cantidad, ubicacion,
        (fecha_vencimiento - CURRENT_DATE) AS dias_restantes
      FROM alimentos 
      WHERE usuario_id = $1 AND (fecha_vencimiento - CURRENT_DATE) >= 0
      ORDER BY dias_restantes ASC
    `, [usuarioId]);

    if (alimentos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No tienes alimentos vigentes en tu despensa para generar una receta.'
      });
    }

    console.log(`🤖 Generando receta personalizada con IA para usuario ${usuarioId}...`);
    const recetaGenerada = await AiRecipeService.generateCustomRecipe(alimentos, usuarioId);

    // Evaluar ingredientes con la despensa
    const [evaluada] = RecommendationEngine.evaluateRecipes([recetaGenerada], alimentos);

    res.status(201).json({
      success: true,
      message: '¡Receta generada por el Chef IA con éxito!',
      data: evaluada
    });
  } catch (err) {
    console.error('Error en generarRecetaIa:', err);
    res.status(500).json({ success: false, message: 'Error al generar receta con IA: ' + err.message });
  }
};

/**
 * GET /api/recetas
 * Catálogo general (mantenido para retrocompatibilidad)
 */
exports.getRecetas = async (req, res) => {
  // Redirigir internamente al motor de recomendaciones inteligentes
  return exports.getRecomendaciones(req, res);
};

/**
 * GET /api/recetas/:id
 * Detalle completo de una receta (local, peruana, TheMealDB o IA)
 */
exports.getRecetaById = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    let recetaEncontrada = null;

    // 1. Buscar en tabla recetas fija de Neon si es ID numérico
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId) && numericId < 100000) {
      const { rows } = await db.query('SELECT * FROM recetas WHERE id = $1', [numericId]);
      if (rows.length > 0) {
        recetaEncontrada = { ...rows[0], origen: 'local', receta_id_externo: String(rows[0].id) };
      }
    }

    // 2. Si no se encontró en la tabla fija, buscar en recetas_cache
    if (!recetaEncontrada) {
      const { rows } = await db.query(
        'SELECT * FROM recetas_cache WHERE receta_id_externo = $1 OR id::text = $1 LIMIT 1',
        [String(id)]
      );
      if (rows.length > 0) {
        recetaEncontrada = rows[0];
      }
    }

    // 3. Si no, buscar en el catálogo peruano integrado
    if (!recetaEncontrada) {
      const foundPeruvian = PERUVIAN_RECIPES.find(
        r => r.receta_id_externo === String(id) || r.nombre.toLowerCase().includes(String(id).toLowerCase())
      );
      if (foundPeruvian) recetaEncontrada = foundPeruvian;
    }

    // 4. Si aún no está y es ID numérico de TheMealDB, consultar la API y cachear
    if (!recetaEncontrada && !isNaN(numericId)) {
      recetaEncontrada = await RecipeApiService.getMealDBRecipeDetail(numericId);
    }

    if (!recetaEncontrada) {
      return res.status(404).json({ success: false, message: 'Receta no encontrada' });
    }

    // Consultar alimentos del usuario para verificar ingredientes
    const { rows: alimentos } = await db.query(`
      SELECT 
        id, nombre, categoria, cantidad, ubicacion,
        (fecha_vencimiento - CURRENT_DATE) AS dias_restantes
      FROM alimentos 
      WHERE usuario_id = $1 AND (fecha_vencimiento - CURRENT_DATE) >= 0
    `, [usuarioId]);

    // Evaluar ingredientes con el motor de recomendaciones
    const [evaluada] = RecommendationEngine.evaluateRecipes([recetaEncontrada], alimentos);

    // Verificar si es favorita y si ya fue cocinada
    const { rows: favRows } = await db.query(
      'SELECT id FROM favoritos WHERE usuario_id = $1 AND receta_id::text = $2',
      [usuarioId, String(id)]
    );
    evaluada.es_favorita = favRows.length > 0;

    res.json({ success: true, data: evaluada });

  } catch (err) {
    console.error('Error en getRecetaById:', err);
    res.status(500).json({ success: false, message: 'Error al consultar receta', error: err.message });
  }
};

/**
 * POST /api/recetas/:id/favorito
 * Marca o desmarca una receta como favorita.
 * Soporta IDs numéricos (tabla recetas) e IDs externos (recetas_cache / peruanas / IA).
 */
exports.toggleFavorito = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    const numId = parseInt(id, 10);
    const esNumerico = !isNaN(numId) && numId > 0 && numId < 2147483647;

    // Para recetas de la tabla fija (numericId < 1000) usamos la tabla favoritos
    if (esNumerico && numId < 1000) {
      const { rows: existente } = await db.query(
        'SELECT id FROM favoritos WHERE usuario_id = $1 AND receta_id = $2',
        [usuarioId, numId]
      );

      if (existente.length > 0) {
        await db.query('DELETE FROM favoritos WHERE id = $1', [existente[0].id]);
        return res.json({ success: true, message: 'Receta quitada de favoritos', es_favorita: false });
      } else {
        await db.query('INSERT INTO favoritos (usuario_id, receta_id) VALUES ($1, $2)', [usuarioId, numId]);
        return res.json({ success: true, message: 'Receta guardada en favoritos', es_favorita: true });
      }
    }

    // Para recetas externas (peruanas, TheMealDB, IA) — el favorito se gestiona en caché
    // Sólo confirmamos la operación (el estado persiste en localStorage del cliente)
    return res.json({
      success: true,
      message: `Favorito de receta externa "${id}" actualizado localmente.`,
      es_favorita: true,
      externo: true
    });

  } catch (err) {
    console.error('Error en toggleFavorito:', err);
    res.status(500).json({ success: false, message: 'Error al alternar favorito', error: err.message });
  }
};

/**
 * POST /api/recetas/:id/cocinar
 * Marca la receta como cocinada y descuenta de Neon los ingredientes disponibles usados
 */
exports.cocinarReceta = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;
    const descontarAlimentos = req.body.descontar_alimentos !== false;

    await client.query('BEGIN');

    // Obtener los alimentos vigentes del usuario (con datos para el historial)
    const { rows: alimentos } = await client.query(`
      SELECT id, nombre, categoria, cantidad, ubicacion,
             fecha_vencimiento, notas, imagen, color, inicial
        FROM alimentos
       WHERE usuario_id = $1
       ORDER BY (fecha_vencimiento - CURRENT_DATE) ASC
    `, [usuarioId]);

    let recetaEncontrada = null;

    // Buscar receta en BD, caché o catálogo
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId) && numericId < 100000) {
      const { rows } = await client.query('SELECT * FROM recetas WHERE id = $1', [numericId]);
      if (rows.length > 0) recetaEncontrada = rows[0];
    }

    if (!recetaEncontrada) {
      const { rows } = await client.query(
        'SELECT * FROM recetas_cache WHERE receta_id_externo = $1 OR id::text = $1 LIMIT 1',
        [String(id)]
      );
      if (rows.length > 0) recetaEncontrada = rows[0];
    }

    if (!recetaEncontrada) {
      recetaEncontrada = PERUVIAN_RECIPES.find(r => r.receta_id_externo === String(id));
    }

    const nombreReceta = recetaEncontrada ? recetaEncontrada.nombre : `Receta #${id}`;

    // Registrar en recetas_cocinadas
    // Para IDs externos (peru_01, ia_xxx, TheMealDB), usar receta_id=1 y guardar el ID/nombre real
    // Para recetas fijas de la tabla recetas (IDs 1-6), usar su ID; para TheMealDB o peruanas, asociar a ID 1
    const refId = (!isNaN(numericId) && numericId >= 1 && numericId <= 6) ? numericId : 1;
    const idExterno = (refId === numericId) ? null : String(id);
    await client.query(
      'INSERT INTO recetas_cocinadas (usuario_id, receta_id, receta_nombre, receta_id_externo) VALUES ($1, $2, $3, $4)',
      [usuarioId, refId, nombreReceta, idExterno]
    );

    // Descontar alimentos usados de Neon y registrar el consumo en el historial
    const descontados = [];
    if (descontarAlimentos && recetaEncontrada && Array.isArray(recetaEncontrada.ingredientes)) {
      for (const ing of recetaEncontrada.ingredientes) {
        const ingName = typeof ing === 'string' ? ing : (ing.nombre || ing.name || '');
        const match = alimentos.find(a =>
          a.cantidad > 0 && RecommendationEngine.matchesIngredient(ingName, a.nombre)
        );

        if (match) {
          const unidadesUsadas = 1;

          if (match.cantidad > 1) {
            await client.query('UPDATE alimentos SET cantidad = cantidad - 1 WHERE id = $1', [match.id]);
            match.cantidad -= 1;
            descontados.push(`${match.nombre} (-1 unidad)`);
          } else {
            await client.query('DELETE FROM alimentos WHERE id = $1', [match.id]);
            match.cantidad = 0;
            descontados.push(`${match.nombre} (agotado)`);
          }

          await client.query(
            `INSERT INTO alimentos_consumidos
              (usuario_id, alimento_id, nombre, categoria, cantidad, ubicacion,
               fecha_vencimiento, notas, imagen, color, inicial, motivo, fecha_consumo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'cocinado', CURRENT_TIMESTAMP)`,
            [
              usuarioId,
              match.id,
              match.nombre,
              match.categoria,
              unidadesUsadas,
              match.ubicacion,
              match.fecha_vencimiento,
              (match.notas ? match.notas + ' · ' : '') + 'Usado en receta: ' + nombreReceta,
              match.imagen,
              match.color,
              match.inicial
            ]
          );
        }
      }
    }

    await client.query('COMMIT');

    console.log(`🍳 Receta "${nombreReceta}" cocinada. Ingredientes descontados: ${descontados.join(', ') || 'Ninguno'}`);
    res.json({
      success: true,
      message: `¡Receta "${nombreReceta}" cocinada con éxito!`,
      alimentos_descontados: descontados
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en cocinarReceta:', err);
    res.status(500).json({ success: false, message: 'Error al marcar receta como cocinada', error: err.message });
  } finally {
    client.release();
  }
};
