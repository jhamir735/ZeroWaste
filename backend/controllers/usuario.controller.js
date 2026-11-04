/* =============================================
   ZeroWaste – Usuario y Estadísticas Controller
   Archivo: backend/controllers/usuario.controller.js
   ============================================= */
'use strict';

const db = require('../config/db');
const StatsService = require('../services/stats.service');

// GET /api/usuario
exports.getUsuario = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nombre, email, username, fecha_registro FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

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
    const { nombre, email } = req.body || {};

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    }

    const query = `
      UPDATE usuarios
         SET nombre = $1,
             email = COALESCE($2, email),
             fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, nombre, email, username, fecha_registro
    `;
    const { rows } = await db.query(query, [
      String(nombre).trim(),
      email ? String(email).trim().toLowerCase() : null,
      req.usuario.id
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, message: 'Perfil actualizado', data: rows[0] });
  } catch (err) {
    console.error('Error en updateUsuario:', err);
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Ese correo electrónico ya está registrado.' });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar usuario', error: err.message });
  }
};

// GET /api/estadisticas
exports.getEstadisticas = async (req, res) => {
  try {
    const data = await StatsService.getEstadisticasUsuario(req.usuario.id);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error en getEstadisticas:', err);
    res.status(500).json({ success: false, message: 'Error al calcular estadísticas', error: err.message });
  }
};
