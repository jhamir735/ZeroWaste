/* =============================================
   ZeroWaste – Rutas de Historial
   Archivo: backend/routes/historial.routes.js
   ============================================= */
'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/historial.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/', requireAuth, controller.getHistorial);

module.exports = router;
