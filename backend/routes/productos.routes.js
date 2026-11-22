/* =============================================
   ZeroWaste – Rutas de Productos (código de barras)
   Archivo: backend/routes/productos.routes.js
   GET /api/productos/barcode/:codigo
   ============================================= */
'use strict';

const express = require('express');
const router = express.Router();
const { buscarPorCodigo } = require('../services/producto.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/barcode/:codigo', async (req, res) => {
  try {
    const r = await buscarPorCodigo(req.params.codigo);
    if (r.invalido) return res.status(400).json({ success: false, found: false, message: 'Código de barras no válido' });
    res.json({ success: true, found: r.found, source: r.source || null, offline: !!r.offline, codigo: r.codigo || (r.producto && r.producto.codigo) || null, data: r.producto || null });
  } catch (e) {
    console.error('Error buscando producto:', e);
    res.status(500).json({ success: false, message: 'No se pudo buscar el producto' });
  }
});

module.exports = router;
