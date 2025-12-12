// backend/routes/celebracoesRoutes.js
const express = require('express');
const router = express.Router();
const {
  listarCelebracoes,
  criarNovaCelebracao,
  verificarDisponibilidadeCelebracao,
  atualizarCelebracao,
  removerCelebracao
} = require('../controllers/celebracoesController');

// GET /api/celebracoes  -> lista todas
router.get('/', listarCelebracoes);

// NOVO: GET /api/celebracoes/disponibilidade?data=...&hora=...
router.get('/disponibilidade', verificarDisponibilidadeCelebracao);

// POST /api/celebracoes -> cria nova celebração
router.post('/', criarNovaCelebracao);

router.put("/:id", atualizarCelebracao);
router.delete("/:id", removerCelebracao);

module.exports = router;
