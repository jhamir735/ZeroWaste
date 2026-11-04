/* =============================================
   ZeroWaste – Rutas de Reportes
   Archivo: backend/routes/reportes.routes.js
   ============================================= */
'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportes.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/:tipo', requireAuth, controller.descargarReporte);

module.exports = router;
