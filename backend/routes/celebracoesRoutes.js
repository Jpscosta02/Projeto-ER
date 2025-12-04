// backend/routes/celebracoesRoutes.js
const express = require('express');
const router = express.Router();
const {
  listarCelebracoes,
  criarNovaCelebracao
} = require('../controllers/celebracoesController');

// GET /api/celebracoes  -> lista todas
router.get('/', listarCelebracoes);

// POST /api/celebracoes -> cria nova celebração
router.post('/', criarNovaCelebracao);

module.exports = router;
