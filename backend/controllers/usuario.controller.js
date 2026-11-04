/* =============================================
   ZeroWaste – Usuario y Estadísticas Controller
   Archivo: backend/controllers/usuario.controller.js
   ============================================= */
'use strict';

const db = require('../config/db');

// GET /api/usuario
exports.getUsuario = async (req, res) => {
  try {
    const usuarioId = req.query.id || 1;
    const { rows } = await db.query('SELECT id, nombre, email, fecha_registro FROM usuarios WHERE id = $1', [usuarioId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error en getUsuario:', err);
    res.status(500).json({ success: false, message: 'Error al consultar usuario', error: err.message });
  }
};

// PUT /api/usuario
exports.updateUsuario = async (req, res) => {
  try {
    const usuarioId = req.body.id || 1;
    const { nombre, email } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    }

    const query = `
      UPDATE usuarios 
      SET nombre = $1, email = COALESCE($2, email)
      WHERE id = $3
      RETURNING id, nombre, email, fecha_registro
    `;
    const { rows } = await db.query(query, [nombre.trim(), email ? email.trim() : null, usuarioId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, message: 'Perfil actualizado', data: rows[0] });
  } catch (err) {
    console.error('Error en updateUsuario:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar usuario', error: err.message });
  }
};

// GET /api/estadisticas
exports.getEstadisticas = async (req, res) => {
  try {
    const usuarioId = req.query.usuario_id || 1;

    // 1. Total alimentos actuales, urgentes y próximos
    const { rows: alimStats } = await db.query(`
      SELECT 
        COUNT(*)::int AS total_alimentos,
        COUNT(CASE WHEN (fecha_vencimiento - CURRENT_DATE) <= 0 THEN 1 END)::int AS urgentes,
        COUNT(CASE WHEN (fecha_vencimiento - CURRENT_DATE) > 0 AND (fecha_vencimiento - CURRENT_DATE) <= 3 THEN 1 END)::int AS proximos
      FROM alimentos
      WHERE usuario_id = $1
    `, [usuarioId]);

    // 2. Total recetas cocinadas (historial completo en Neon)
    const { rows: cookStats } = await db.query(`
      SELECT COUNT(*)::int AS total_cocinadas 
      FROM recetas_cocinadas 
      WHERE usuario_id = $1
    `, [usuarioId]);

    // 3. Recetas cocinadas por semana (últimas 6 semanas) para gráfico
    const { rows: porSemana } = await db.query(`
      SELECT 
        DATE_TRUNC('week', fecha_cocinado) AS semana,
        COUNT(*)::int AS cantidad
      FROM recetas_cocinadas
      WHERE usuario_id = $1
        AND fecha_cocinado >= CURRENT_DATE - INTERVAL '6 weeks'
      GROUP BY semana
      ORDER BY semana ASC
    `, [usuarioId]);

    // 4. Alimentos registrados por mes (últimos 6 meses) para gráfico
    const { rows: porMes } = await db.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', fecha_creacion), 'Mon') AS mes,
        COUNT(*)::int AS cantidad
      FROM alimentos
      WHERE usuario_id = $1
        AND fecha_creacion >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', fecha_creacion)
      ORDER BY DATE_TRUNC('month', fecha_creacion) ASC
    `, [usuarioId]);

    const totalAlimentos = alimStats[0].total_alimentos || 0;
    const urgentes       = alimStats[0].urgentes || 0;
    const proximos       = alimStats[0].proximos || 0;
    const totalCocinadas = cookStats[0].total_cocinadas || 0;

    // Fórmulas de impacto basadas en datos reales de Neon:
    // Ahorro: S/ 48.00 base + S/ 8.25 por receta cocinada + S/ 1.50 por alimento controlado
    const ahorroSoles   = 48.00 + (totalCocinadas * 8.25) + (totalAlimentos * 1.50);
    // Kg desperdicio evitado: 2.6 kg base + 0.4 kg por receta cocinada + 0.15 kg por alimento
    const kgDesperdicio = 2.6   + (totalCocinadas * 0.4)  + (totalAlimentos * 0.15);
    // Alimentos salvados totales
    const alimentosSalvados = 6 + (totalCocinadas * 2) + Math.max(0, totalAlimentos - urgentes);

    res.json({
      success: true,
      data: {
        total_en_inventario:     totalAlimentos,
        alertas_activas:         urgentes + proximos,
        alimentos_urgentes_hoy:  urgentes,
        proximos_a_vencer:       proximos,
        recetas_cocinadas:       totalCocinadas,
        dinero_ahorrado_pen:     parseFloat(ahorroSoles.toFixed(2)),
        kg_desperdicio_evitado:  parseFloat(kgDesperdicio.toFixed(1)),
        alimentos_salvados_total: alimentosSalvados,
        historico_semanal:       porSemana,  // Para gráfico detallado
        historico_mensual:       porMes,     // Para gráfico detallado
        logros: {
          principiante:   alimentosSalvados >= 1,
          chef_creativo:  totalCocinadas >= 1,
          heroe_verde:    ahorroSoles >= 50.0,
          despensa_activa: totalAlimentos >= 10
        }
      }
    });
  } catch (err) {
    console.error('Error en getEstadisticas:', err);
    res.status(500).json({ success: false, message: 'Error al calcular estadísticas', error: err.message });
  }
};

