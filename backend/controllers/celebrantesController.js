// backend/controllers/celebrantesController.js
const { getTodosCelebrantes } = require('../models/Celebrante');

async function listarCelebrantes(req, res) {
  try {
    const dados = await getTodosCelebrantes();
    res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar celebrantes:', err);
    res.status(500).json({ error: 'Erro ao buscar celebrantes' });
  }
}

module.exports = { listarCelebrantes };
