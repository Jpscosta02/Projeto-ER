// backend/controllers/statsController.js
const { getStats } = require('../models/Stats');

async function obterStats(req, res) {
  try {
    const dados = await getStats();
    res.json(dados);
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    res.status(500).json({ error: 'Erro ao calcular estatísticas' });
  }
}

module.exports = { obterStats };
