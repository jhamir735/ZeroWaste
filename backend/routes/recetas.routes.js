/* =============================================
   ZeroWaste – Rutas de Recetas Inteligentes
   Archivo: backend/routes/recetas.routes.js
   ============================================= */
'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/recetas.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Rutas especializadas (deben ir antes de las parametrizadas :id)
router.get('/recomendaciones', controller.getRecomendaciones);
router.post('/generar-ia', controller.generarRecetaIa);

// Rutas generales y detalle
router.get('/', controller.getRecetas);
router.get('/:id', controller.getRecetaById);
router.post('/:id/favorito', controller.toggleFavorito);
router.post('/:id/cocinar', controller.cocinarReceta);

module.exports = router;
