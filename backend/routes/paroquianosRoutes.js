// backend/routes/paroquianosRoutes.js
const express = require('express');
const router = express.Router();
const { listarParoquianos } = require('../controllers/paroquianosController');

// GET /api/paroquianos
router.get('/', listarParoquianos);

module.exports = router;
