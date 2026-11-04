/* =============================================
   ZeroWaste – Rutas de Autenticación
   Archivo: backend/routes/auth.routes.js
   ============================================= */
'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/registro', controller.registro);
router.post('/login', controller.login);
router.get('/me', requireAuth, controller.me);
router.put('/password', requireAuth, controller.cambiarPassword);

module.exports = router;
