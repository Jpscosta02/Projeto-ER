// backend/controllers/sacramentosController.js
const { getTodosSacramentos } = require('../models/Sacramento');

async function listarSacramentos(req, res) {
  try {
    const dados = await getTodosSacramentos();
    res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar sacramentos:', err);
    res.status(500).json({ error: 'Erro ao buscar sacramentos' });
  }
}

module.exports = { listarSacramentos };
