// backend/routes/celebrantesRoutes.js
const express = require('express');
const router = express.Router();
const { listarCelebrantes } = require('../controllers/celebrantesController');
const { listarConfirmacoesPendentesCelebrante } = require('../controllers/celebracoesController');

// GET /api/celebrantes
router.get('/', listarCelebrantes);
router.get('/:id/confirmacoes-pendentes', listarConfirmacoesPendentesCelebrante);

module.exports = router;
