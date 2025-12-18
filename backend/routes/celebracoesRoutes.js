// backend/routes/celebracoesRoutes.js
const express = require('express');
const router = express.Router();
const {
  listarCelebracoes,
  criarNovaCelebracao,
  verificarDisponibilidadeCelebracao,
  listarMissasPorData,
  listarMissasDisponiveis,
  listarIntencoesCelebracao,
  atualizarCelebracao,
  removerCelebracao,
  solicitarConfirmacao,
  atualizarEstadoConfirmacao,
  listarParticipantesCelebracao,
  adicionarParticipanteCelebracao,
  removerParticipanteCelebracao,
} = require('../controllers/celebracoesController');

// GET /api/celebracoes  -> lista todas
router.get('/', listarCelebracoes);

// NOVO: GET /api/celebracoes/disponibilidade?data=...&hora=...
router.get('/disponibilidade', verificarDisponibilidadeCelebracao);

// GET /api/celebracoes/missas?data=YYYY-MM-DD
router.get('/missas', listarMissasPorData);

// GET /api/celebracoes/missas-disponiveis
router.get('/missas-disponiveis', listarMissasDisponiveis);

// POST /api/celebracoes -> cria nova celebração
router.post('/', criarNovaCelebracao);

// GET /api/celebracoes/:id/intencoes
router.get('/:id/intencoes', listarIntencoesCelebracao);

router.put("/:id", atualizarCelebracao);
router.delete("/:id", removerCelebracao);
router.post("/:id/confirmacao/solicitar", solicitarConfirmacao);
router.post("/:id/confirmacao", atualizarEstadoConfirmacao);
router.get("/:id/participantes", listarParticipantesCelebracao);
router.post("/:id/participantes", adicionarParticipanteCelebracao);
router.delete("/:id/participantes/:paroquianoId", removerParticipanteCelebracao);

module.exports = router;
