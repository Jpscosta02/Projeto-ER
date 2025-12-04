// backend/controllers/celebracoesController.js
const { getTodasCelebracoes } = require('../models/Celebracao');

async function listarCelebracoes(req, res) {
  try {
    const dados = await getTodasCelebracoes();
    res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar celebrações:', err);
    res.status(500).json({ error: 'Erro ao buscar celebrações' });
  }
}

module.exports = { listarCelebracoes };
