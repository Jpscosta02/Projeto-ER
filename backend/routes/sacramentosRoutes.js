// backend/routes/sacramentosRoutes.js
const express = require('express');
const router = express.Router();
const { listarSacramentos } = require('../controllers/sacramentosController');

// GET /api/sacramentos
router.get('/', listarSacramentos);

module.exports = router;
