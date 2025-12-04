// backend/routes/aniversariantesRoutes.js
const express = require('express');
const router = express.Router();
const { listarAniversariantes } = require('../controllers/aniversariantesController');

// GET /api/aniversariantes/:mes
router.get('/:mes', listarAniversariantes);

module.exports = router;
