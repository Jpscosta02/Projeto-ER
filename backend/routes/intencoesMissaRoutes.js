// backend/routes/intencoesMissaRoutes.js
const express = require('express');
const router = express.Router();
const {
  submeterIntencaoMissa,
  listarIntencoes,
  decidirIntencao,
  listarMinhasDecisoes,
  marcarNotificado,
} = require('../controllers/intencoesMissaController');

// GET /api/intencoes-missa?estado=pendente|aprovada|rejeitada
router.get('/', listarIntencoes);

// GET /api/intencoes-missa/minhas?email=...
router.get('/minhas', listarMinhasDecisoes);

// POST /api/intencoes-missa
router.post('/', submeterIntencaoMissa);

// POST /api/intencoes-missa/:id/decisao  { estado: 'aprovada'|'rejeitada', motivo?: string }
router.post('/:id/decisao', decidirIntencao);

// POST /api/intencoes-missa/:id/notificado
router.post('/:id/notificado', marcarNotificado);

module.exports = router;
