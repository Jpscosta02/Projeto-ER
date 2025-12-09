// backend/routes/celebracoesRoutes.js
const express = require('express');
const router = express.Router();
const {
  listarCelebracoes,
  criarNovaCelebracao,
  verificarDisponibilidadeCelebracao,
  atualizarCelebracao
} = require('../controllers/celebracoesController');

// GET /api/celebracoes  -> lista todas
router.get('/', listarCelebracoes);

// NOVO: GET /api/celebracoes/disponibilidade?data=...&hora=...
router.get('/disponibilidade', verificarDisponibilidadeCelebracao);

// POST /api/celebracoes -> cria nova celebração
router.post('/', criarNovaCelebracao);

router.put("/:id", atualizarCelebracao);

module.exports = router;
