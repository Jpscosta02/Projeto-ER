// backend/controllers/aniversariantesController.js
const { getAniversariantesDoMes } = require('../models/Paroquiano');

async function listarAniversariantes(req, res) {
  try {
    const mes = parseInt(req.params.mes);
    const dados = await getAniversariantesDoMes(mes);
    res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar aniversariantes:', err);
    res.status(500).json({ error: 'Erro ao buscar aniversariantes' });
  }
}

module.exports = { listarAniversariantes };
