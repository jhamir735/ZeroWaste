/* =============================================
   ZeroWaste – Alimentos Controller
   Archivo: backend/controllers/alimentos.controller.js
   Todos los datos están aislados por usuario autenticado.
   ============================================= */
'use strict';

const db = require('../config/db');

// Colores para avatares
const AVATAR_COLORS = [
  '#A71619', '#1E7A46', '#F5A524', '#2F9E5B',
  '#55665B', '#6B48A3', '#D3B38D', '#0B6E4F', '#C0392B'
];

const MOTIVOS_VALIDOS = ['consumido', 'eliminado', 'cocinado'];

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

function normalizarMotivo (value) {
  const motivo = String(value || '').toLowerCase();
  return MOTIVOS_VALIDOS.includes(motivo) ? motivo : 'consumido';
}

// GET /api/alimentos
exports.getAlimentos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
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
    const usuarioId = req.usuario.id;

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
      WHERE id = $1 AND usuario_id = $2
    `, [id, req.usuario.id]);

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
      nombre,
      categoria,
      cantidad = 1,
      ubicacion = 'refrigeradora',
      fecha_vencimiento,
      notas = '',
      imagen = null
    } = req.body || {};

    if (!nombre || !categoria || !fecha_vencimiento) {
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, categoria y fecha_vencimiento son obligatorios.'
      });
    }

    const inicial = String(nombre).trim().charAt(0).toUpperCase();
    const color = getAvatarColor(String(nombre).trim());

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
      req.usuario.id,
      String(nombre).trim(),
      String(categoria).trim().toLowerCase(),
      Math.max(1, parseInt(cantidad, 10) || 1),
      String(ubicacion).trim().toLowerCase(),
      fecha_vencimiento,
      notas ? String(notas).trim() : '',
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
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { nombre, categoria, cantidad, ubicacion, fecha_vencimiento, notas, imagen } = req.body || {};
    const nuevaCantidad = cantidad !== undefined ? parseInt(cantidad, 10) : null;

    if (nuevaCantidad !== null && (isNaN(nuevaCantidad) || nuevaCantidad <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser mayor a cero. Usa el historial para registrar el consumo.'
      });
    }

    const usuarioId = req.usuario.id;
    const nombreLimpio = nombre ? String(nombre).trim() : null;

    await client.query('BEGIN');

    const { rows: actuales } = await client.query(
      'SELECT * FROM alimentos WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, usuarioId]
    );

    if (actuales.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Alimento no encontrado para actualizar' });
    }

    const actual = actuales[0];
    let cantidadConsumida = 0;

    // Si la cantidad disminuye, registramos las unidades consumidas en el historial.
    if (nuevaCantidad !== null && nuevaCantidad < actual.cantidad) {
      cantidadConsumida = actual.cantidad - nuevaCantidad;
      const motivo = normalizarMotivo(req.body.motivo || req.query.motivo);

      await client.query(
        `INSERT INTO alimentos_consumidos
          (usuario_id, alimento_id, nombre, categoria, cantidad, ubicacion,
           fecha_vencimiento, notas, imagen, color, inicial, motivo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          usuarioId,
          actual.id,
          actual.nombre,
          actual.categoria,
          cantidadConsumida,
          actual.ubicacion,
          actual.fecha_vencimiento,
          actual.notas,
          actual.imagen,
          actual.color,
          actual.inicial,
          motivo
        ]
      );
    }

    const query = `
      UPDATE alimentos
      SET
        nombre = COALESCE($1, nombre),
        categoria = COALESCE($2, categoria),
        cantidad = COALESCE($3, cantidad),
        ubicacion = COALESCE($4, ubicacion),
        fecha_vencimiento = COALESCE($5, fecha_vencimiento),
        notas = COALESCE($6, notas),
        imagen = COALESCE($7, imagen),
        color = COALESCE($8, color),
        inicial = COALESCE($9, inicial)
      WHERE id = $10 AND usuario_id = $11
      RETURNING
        id, usuario_id, nombre, categoria, cantidad, ubicacion,
        TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
        (fecha_vencimiento - CURRENT_DATE) AS dias_restantes,
        notas, imagen, color, inicial
    `;
    const values = [
      nombreLimpio,
      categoria,
      nuevaCantidad,
      ubicacion,
      fecha_vencimiento,
      notas,
      imagen,
      nombreLimpio ? getAvatarColor(nombreLimpio) : null,
      nombreLimpio ? nombreLimpio.charAt(0).toUpperCase() : null,
      id,
      usuarioId
    ];
    const { rows } = await client.query(query, values);
    await client.query('COMMIT');

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alimento no encontrado para actualizar' });
    }

    const actualizado = rows[0];
    const dias = parseInt(actualizado.dias_restantes, 10);
    res.json({
      success: true,
      message: 'Alimento actualizado',
      data: { ...actualizado, dias, badge: getBadgeInfo(dias) },
      cantidad_consumida: cantidadConsumida
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Error en updateAlimento:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar alimento', error: err.message });
  } finally {
    client.release();
  }
};

// DELETE /api/alimentos/:id
exports.deleteAlimento = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const nombre = req.query.nombre || (req.body && req.body.nombre);
    const motivo = normalizarMotivo(req.query.motivo || (req.body && req.body.motivo));
    const usuarioId = req.usuario.id;

    const numericId = parseInt(id, 10);
    const idValido = !isNaN(numericId) && numericId > 0 && numericId < 2147483647;

    await client.query('BEGIN');

    let item = null;

    if (idValido) {
      const { rows } = await client.query(
        'SELECT * FROM alimentos WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
        [numericId, usuarioId]
      );
      if (rows.length > 0) item = rows[0];
    }

    if (!item && nombre && String(nombre).trim()) {
      const { rows } = await client.query(
        `SELECT * FROM alimentos
          WHERE usuario_id = $1 AND LOWER(nombre) = LOWER($2)
          ORDER BY id ASC LIMIT 1
          FOR UPDATE`,
        [usuarioId, String(nombre).trim()]
      );
      if (rows.length > 0) item = rows[0];
    }

    if (!item) {
      await client.query('ROLLBACK');
      console.warn(`⚠️ Alimento no encontrado para eliminar: ID=${id}, Nombre=${nombre}`);
      return res.status(404).json({ success: false, message: 'Alimento no encontrado para eliminar en la base de datos' });
    }

    await client.query(
      `INSERT INTO alimentos_consumidos
        (usuario_id, alimento_id, nombre, categoria, cantidad, ubicacion,
         fecha_vencimiento, notas, imagen, color, inicial, motivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        usuarioId,
        item.id,
        item.nombre,
        item.categoria,
        item.cantidad,
        item.ubicacion,
        item.fecha_vencimiento,
        item.notas,
        item.imagen,
        item.color,
        item.inicial,
        motivo
      ]
    );

    await client.query('DELETE FROM alimentos WHERE id = $1 AND usuario_id = $2', [item.id, usuarioId]);
    await client.query('COMMIT');

    console.log(`🗑 Alimento "${item.nombre}" (ID: ${item.id}) registrado como ${motivo} y eliminado del inventario.`);

    res.json({
      success: true,
      message: `Alimento "${item.nombre}" ${motivo === 'eliminado' ? 'eliminado' : 'consumido'} correctamente`,
      data: { id: item.id, nombre: item.nombre, motivo }
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Error en deleteAlimento:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar alimento', error: err.message });
  } finally {
    client.release();
  }
};
