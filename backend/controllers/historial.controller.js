/* =============================================
   ZeroWaste – Historial de Consumo Controller
   Archivo: backend/controllers/historial.controller.js
   ============================================= */
'use strict';

const db = require('../config/db');

const MOTIVOS = ['consumido', 'eliminado', 'cocinado'];

function parseLimit (value, fallback) {
  const n = parseInt(value, 10);
  if (isNaN(n) || n <= 0) return fallback;
  return Math.min(n, 100);
}

// GET /api/historial?limite=20&offset=0&motivo=todos
exports.getHistorial = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const limite = parseLimit(req.query.limite, 20);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const offsetConsumos = Math.max(
      0,
      parseInt(req.query.offset_consumos, 10) || offset
    );
    const offsetCocinados = Math.max(
      0,
      parseInt(req.query.offset_cocinados, 10) || offset
    );
    const motivo = String(req.query.motivo || 'todos').toLowerCase();
    const filtroMotivo = MOTIVOS.includes(motivo) ? motivo : null;

    const params = [usuarioId];
    let whereMotivo = '';
    if (filtroMotivo) {
      params.push(filtroMotivo);
      whereMotivo = ` AND motivo = $${params.length}`;
    }

    const consumosParams = [...params, limite, offsetConsumos];
    const limiteIdx = consumosParams.length - 1;
    const offsetIdx = consumosParams.length;

    const [consumosRes, totalConsumosRes, cocinadosRes, totalCocinadosRes, resumenRes] = await Promise.all([
      db.query(`
        SELECT id, alimento_id, nombre, categoria, cantidad, ubicacion,
               TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
               notas, imagen, color, inicial, motivo,
               TO_CHAR(fecha_consumo, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_consumo
          FROM alimentos_consumidos
         WHERE usuario_id = $1${whereMotivo}
         ORDER BY fecha_consumo DESC, id DESC
         LIMIT $${limiteIdx} OFFSET $${offsetIdx}
      `, consumosParams),

      db.query(`
        SELECT COUNT(*)::int AS total
          FROM alimentos_consumidos
         WHERE usuario_id = $1${whereMotivo}
      `, params),

      db.query(`
        SELECT rc.id,
               COALESCE(rc.receta_nombre, r.nombre, 'Receta #' || rc.receta_id) AS nombre,
               rc.receta_id,
               rc.receta_id_externo,
               TO_CHAR(rc.fecha_cocinado, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_cocinado,
               r.color,
               r.inicial,
               r.tiempo,
               r.porciones
          FROM recetas_cocinadas rc
          LEFT JOIN recetas r ON r.id = rc.receta_id
         WHERE rc.usuario_id = $1
         ORDER BY rc.fecha_cocinado DESC, rc.id DESC
         LIMIT $2 OFFSET $3
      `, [usuarioId, limite, offsetCocinados]),

      db.query('SELECT COUNT(*)::int AS total FROM recetas_cocinadas WHERE usuario_id = $1', [usuarioId]),

      db.query(`
        SELECT
          COALESCE(SUM(cantidad) FILTER (WHERE motivo = 'consumido'), 0)::int AS consumidos,
          COALESCE(SUM(cantidad) FILTER (WHERE motivo = 'eliminado'), 0)::int AS eliminados,
          COALESCE(SUM(cantidad) FILTER (WHERE motivo = 'cocinado'), 0)::int AS usados_receta,
          COUNT(*)::int AS registros
        FROM alimentos_consumidos
        WHERE usuario_id = $1
      `, [usuarioId])
    ]);

    const totalConsumos = totalConsumosRes.rows[0].total || 0;
    const totalCocinados = totalCocinadosRes.rows[0].total || 0;
    const resumen = resumenRes.rows[0] || {};

    res.json({
      success: true,
      data: {
        consumos: consumosRes.rows,
        cocinados: cocinadosRes.rows,
        total_consumos: totalConsumos,
        total_cocinados: totalCocinados,
        resumen: {
          consumidos: resumen.consumidos || 0,
          eliminados: resumen.eliminados || 0,
          usados_receta: resumen.usados_receta || 0,
          registros: resumen.registros || 0
        },
        paginacion: {
          limite,
          offset_consumos: offsetConsumos,
          offset_cocinados: offsetCocinados,
          hay_mas_consumos: offsetConsumos + consumosRes.rows.length < totalConsumos,
          hay_mas_cocinados: offsetCocinados + cocinadosRes.rows.length < totalCocinados
        }
      }
    });
  } catch (err) {
    console.error('Error en getHistorial:', err);
    res.status(500).json({ success: false, message: 'No se pudo consultar el historial', error: err.message });
  }
};
