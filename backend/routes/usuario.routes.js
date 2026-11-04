/* =============================================
   ZeroWaste – Rutas de Usuario y Estadísticas
   Archivo: backend/routes/usuario.routes.js
   ============================================= */
'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuario.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/usuario', requireAuth, controller.getUsuario);
router.put('/usuario', requireAuth, controller.updateUsuario);
router.get('/estadisticas', requireAuth, controller.getEstadisticas);

module.exports = router;
