// backend/controllers/paroquianosController.js
const { getTodosParoquianos } = require('../models/Paroquiano');

async function listarParoquianos(req, res) {
  try {
    const dados = await getTodosParoquianos();
    res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar paroquianos:', err);
    res.status(500).json({ error: 'Erro ao buscar paroquianos' });
  }
}

module.exports = { listarParoquianos };
