/* =============================================
   ZeroWaste – Rutas de Usuario y Estadísticas
   Archivo: backend/routes/usuario.routes.js
   ============================================= */
'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuario.controller');

router.get('/usuario', controller.getUsuario);
router.put('/usuario', controller.updateUsuario);
router.get('/estadisticas', controller.getEstadisticas);

module.exports = router;

