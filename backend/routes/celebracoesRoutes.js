// backend/routes/celebracoesRoutes.js
const express = require('express');
const router = express.Router();
const { listarCelebracoes } = require('../controllers/celebracoesController');

// GET /api/celebracoes
router.get('/', listarCelebracoes);

module.exports = router;
