/* =============================================
   ZeroWaste – Rutas de Alimentos
   Archivo: backend/routes/alimentos.routes.js
   ============================================= */
'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/alimentos.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/', controller.getAlimentos);
router.get('/alertas', controller.getAlertas);
router.get('/:id', controller.getAlimentoById);
router.post('/', controller.createAlimento);
router.put('/:id', controller.updateAlimento);
router.delete('/:id', controller.deleteAlimento);

module.exports = router;
