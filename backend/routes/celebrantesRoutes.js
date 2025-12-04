// backend/routes/celebrantesRoutes.js
const express = require('express');
const router = express.Router();
const { listarCelebrantes } = require('../controllers/celebrantesController');

// GET /api/celebrantes
router.get('/', listarCelebrantes);

module.exports = router;
