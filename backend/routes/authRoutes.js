// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { registarParoquiano, login } = require('../controllers/authController');
const { bootId } = require('../boot');

router.post('/register', registarParoquiano);
router.post('/login', login);
router.get('/boot', (req, res) => res.json({ bootId }));

module.exports = router;
