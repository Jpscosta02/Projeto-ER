// backend/routes/sacramentosRoutes.js
const express = require('express');
const router = express.Router();
const {
	listarSacramentos,
	criarNovoSacramento,
	verificarDisponibilidadeSacramento,
	atualizarSacramento,
	removerSacramento,
	listarParticipantesSacramento,
	adicionarParticipanteSacramento,
	removerParticipanteSacramento,
} = require('../controllers/sacramentosController');

router.get('/', listarSacramentos);
router.get('/disponibilidade', verificarDisponibilidadeSacramento);
router.post('/', criarNovoSacramento);
router.put('/:id', atualizarSacramento);
router.delete('/:id', removerSacramento);
router.get('/:id/participantes', listarParticipantesSacramento);
router.post('/:id/participantes', adicionarParticipanteSacramento);
router.delete('/:id/participantes/:paroquianoId', removerParticipanteSacramento);

module.exports = router;
