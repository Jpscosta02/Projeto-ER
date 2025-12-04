// backend/routes/statsRoutes.js
const express = require('express');
const router = express.Router();
const { obterStats } = require('../controllers/statsController');

// GET /api/stats
router.get('/', obterStats);

module.exports = router;
