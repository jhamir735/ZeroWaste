/* =============================================
   ZeroWaste – Alimentos Controller
   Archivo: backend/controllers/alimentos.controller.js
   ============================================= */
'use strict';

const db = require('../config/db');

// Colores para avatares
const AVATAR_COLORS = [
  '#A71619', '#1E7A46', '#F5A524', '#2F9E5B',
  '#55665B', '#6B48A3', '#D3B38D', '#0B6E4F', '#C0392B'
];

function getAvatarColor (name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getBadgeInfo (days) {
  if (days <= 0) return { text: 'Vence hoy', cls: 'badge-urgent' };
  if (days === 1) return { text: 'Vence mañana', cls: 'badge-warning' };
  if (days <= 3)  return { text: 'En ' + days + ' días', cls: 'badge-ok' };
  return { text: 'En ' + days + ' días', cls: 'badge-safe' };
}

// GET /api/alimentos
exports.getAlimentos = async (req, res) => {
  try {
    const usuarioId = req.query.usuario_id || 1;
    const categoria = req.query.categoria;
    const busqueda  = req.query.q;

    let query = `
      SELECT 
        id, 
        usuario_id, 
        nombre, 
        categoria, 
        cantidad, 
        ubicacion, 
        TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
        (fecha_vencimiento - CURRENT_DATE) AS dias_restantes,
        notas, 
        imagen, 
        color, 
        inicial,
        fecha_creacion
      FROM alimentos
      WHERE usuario_id = $1
    `;
    const params = [usuarioId];

    if (categoria && categoria !== 'todos') {
      params.push(categoria);
      query += ` AND categoria = $${params.length}`;
    }

    if (busqueda && busqueda.trim()) {
      params.push(`%${busqueda.trim()}%`);
      query += ` AND (nombre ILIKE $${params.length} OR ubicacion ILIKE $${params.length})`;
    }

    query += ` ORDER BY dias_restantes ASC, fecha_vencimiento ASC`;

    const { rows } = await db.query(query, params);

    const alimentosConBadge = rows.map((item) => {
      const dias = parseInt(item.dias_restantes, 10);
      return {
        ...item,
        dias: dias,
        badge: getBadgeInfo(dias)
      };
    });

    res.json({
      success: true,
      count: alimentosConBadge.length,
      data: alimentosConBadge
    });
  } catch (err) {
    console.error('Error en getAlimentos:', err);
    res.status(500).json({ success: false, message: 'Error interno al consultar alimentos', error: err.message });
  }
};

// GET /api/alimentos/alertas
exports.getAlertas = async (req, res) => {
  try {
    const usuarioId = req.query.usuario_id || 1;

    const query = `
      SELECT 
        id, 
        nombre, 
        categoria, 
        cantidad, 
        ubicacion, 
        TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
        (fecha_vencimiento - CURRENT_DATE) AS dias_restantes,
        color, 
        inicial,
        imagen
      FROM alimentos
      WHERE usuario_id = $1 AND (fecha_vencimiento - CURRENT_DATE) <= 3
      ORDER BY dias_restantes ASC
    `;
    const { rows } = await db.query(query, [usuarioId]);

    const alertas = rows.map((item) => {
      const dias = parseInt(item.dias_restantes, 10);
      return {
        ...item,
        dias: dias,
        badge: getBadgeInfo(dias)
      };
    });

    res.json({
      success: true,
      count: alertas.length,
      data: alertas
    });
  } catch (err) {
    console.error('Error en getAlertas:', err);
    res.status(500).json({ success: false, message: 'Error al consultar alertas', error: err.message });
  }
};

// GET /api/alimentos/:id
exports.getAlimentoById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(`
      SELECT 
        id, nombre, categoria, cantidad, ubicacion, 
        TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
        (fecha_vencimiento - CURRENT_DATE) AS dias_restantes,
        notas, imagen, color, inicial 
      FROM alimentos 
      WHERE id = $1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alimento no encontrado' });
    }

    const item = rows[0];
    const dias = parseInt(item.dias_restantes, 10);
    res.json({ success: true, data: { ...item, dias, badge: getBadgeInfo(dias) } });
  } catch (err) {
    console.error('Error en getAlimentoById:', err);
    res.status(500).json({ success: false, message: 'Error al obtener el alimento', error: err.message });
  }
};

// POST /api/alimentos
exports.createAlimento = async (req, res) => {
  try {
    const {
      usuario_id = 1,
      nombre,
      categoria,
      cantidad = 1,
      ubicacion = 'refrigeradora',
      fecha_vencimiento,
      notas = '',
      imagen = null
    } = req.body;

    if (!nombre || !categoria || !fecha_vencimiento) {
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, categoria y fecha_vencimiento son obligatorios.'
      });
    }

    const inicial = nombre.trim().charAt(0).toUpperCase();
    const color = getAvatarColor(nombre.trim());

    const query = `
      INSERT INTO alimentos (usuario_id, nombre, categoria, cantidad, ubicacion, fecha_vencimiento, notas, imagen, color, inicial)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, usuario_id, nombre, categoria, cantidad, ubicacion, 
        TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
        (fecha_vencimiento - CURRENT_DATE) AS dias_restantes,
        notas, imagen, color, inicial, fecha_creacion
    `;
    const values = [
      usuario_id,
      nombre.trim(),
      categoria.trim().toLowerCase(),
      Math.max(1, parseInt(cantidad, 10) || 1),
      ubicacion.trim().toLowerCase(),
      fecha_vencimiento,
      notas ? notas.trim() : '',
      imagen,
      color,
      inicial
    ];

    const { rows } = await db.query(query, values);
    const nuevo = rows[0];
    const dias = parseInt(nuevo.dias_restantes, 10);

    res.status(201).json({
      success: true,
      message: 'Alimento registrado exitosamente',
      data: { ...nuevo, dias, badge: getBadgeInfo(dias) }
    });
  } catch (err) {
    console.error('Error en createAlimento:', err);
    res.status(500).json({ success: false, message: 'Error al registrar alimento', error: err.message });
  }
};

// PUT /api/alimentos/:id
exports.updateAlimento = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, categoria, cantidad, ubicacion, fecha_vencimiento, notas, imagen } = req.body;

    const query = `
      UPDATE alimentos
      SET 
        nombre = COALESCE($1, nombre),
        categoria = COALESCE($2, categoria),
        cantidad = COALESCE($3, cantidad),
        ubicacion = COALESCE($4, ubicacion),
        fecha_vencimiento = COALESCE($5, fecha_vencimiento),
        notas = COALESCE($6, notas),
        imagen = COALESCE($7, imagen)
      WHERE id = $8
      RETURNING 
        id, usuario_id, nombre, categoria, cantidad, ubicacion, 
        TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
        (fecha_vencimiento - CURRENT_DATE) AS dias_restantes,
        notas, imagen, color, inicial
    `;
    const values = [nombre, categoria, cantidad, ubicacion, fecha_vencimiento, notas, imagen, id];
    const { rows } = await db.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alimento no encontrado para actualizar' });
    }

    const actualizado = rows[0];
    const dias = parseInt(actualizado.dias_restantes, 10);
    res.json({
      success: true,
      message: 'Alimento actualizado',
      data: { ...actualizado, dias, badge: getBadgeInfo(dias) }
    });
  } catch (err) {
    console.error('Error en updateAlimento:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar alimento', error: err.message });
  }
};

// DELETE /api/alimentos/:id
exports.deleteAlimento = async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = req.query.nombre || req.body?.nombre;
    const usuarioId = req.query.usuario_id || 1;

    let rows = [];
    
    // 1. Intentar eliminar por ID numérico si es un ID válido en PostgreSQL
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId) && numericId < 2147483647) {
      const result = await db.query('DELETE FROM alimentos WHERE id = $1 RETURNING id, nombre', [numericId]);
      rows = result.rows;
    }

    // 2. Si no se encontró por ID (p. ej. si era un ID temporal de timestamp o mock local), buscar por nombre
    if (rows.length === 0 && nombre && nombre.trim()) {
      const resultName = await db.query(
        'DELETE FROM alimentos WHERE usuario_id = $1 AND LOWER(nombre) = LOWER($2) RETURNING id, nombre',
        [usuarioId, nombre.trim()]
      );
      rows = resultName.rows;
    }

    if (rows.length === 0) {
      console.warn(`⚠️ Alimento no encontrado para eliminar: ID=${id}, Nombre=${nombre}`);
      return res.status(404).json({ success: false, message: 'Alimento no encontrado para eliminar en la base de datos' });
    }

    console.log(`🗑 Alimento eliminado en Neon: "${rows[0].nombre}" (ID: ${rows[0].id})`);
    res.json({
      success: true,
      message: `Alimento "${rows[0].nombre}" eliminado correctamente de la base de datos`,
      data: { id: rows[0].id, nombre: rows[0].nombre }
    });
  } catch (err) {
    console.error('Error en deleteAlimento:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar alimento', error: err.message });
  }
};

