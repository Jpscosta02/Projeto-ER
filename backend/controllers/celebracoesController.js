// backend/controllers/celebracoesController.js
const {
  getTodasCelebracoes,
  getConflitosPorDataHoraLocal,
  criarCelebracao
} = require('../models/Celebracao');

// GET /api/celebracoes
async function listarCelebracoes(req, res) {
  try {
    const dados = await getTodasCelebracoes();
    res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar celebrações:', err);
    res.status(500).json({ error: 'Erro ao buscar celebrações' });
  }
}

// POST /api/celebracoes
// Implementa REQ-01.1 + critérios de aceitação
async function criarNovaCelebracao(req, res) {
  try {
    const { data, hora, tipo, local, celebrante_id } = req.body;

    // 1) Validar campos obrigatórios (data, hora, tipo, celebrante)
    if (!data || !hora || !tipo || !celebrante_id) {
      return res.status(400).json({
        error: 'Data, hora, tipo de celebração e celebrante são obrigatórios.'
      });
    }

    // 2) Verificar se a data/hora já está ocupada
    const conflitos = await getConflitosPorDataHoraLocal(data, hora, local);

    if (conflitos.length > 0) {
      // 3) Mensagem de erro se a data/hora já estiver ocupada
      return res.status(409).json({
        error: 'Já existe uma celebração marcada para essa data e hora.'
      });
    }

    // 4) Registar celebração
    const novaCelebracao = await criarCelebracao({
      data,
      hora,
      tipo,
      local,
      celebranteId: celebrante_id
    });

    // devolve 201 + celebração criada (frontend volta a buscar e mostra no calendário)
    return res.status(201).json(novaCelebracao);
  } catch (err) {
    console.error('Erro ao criar celebração:', err);

    // Proteção extra 
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Já existe uma celebração marcada para essa data e hora.'
      });
    }

    return res.status(500).json({ error: 'Erro interno ao criar celebração.' });
  }
}

module.exports = {
  listarCelebracoes,
  criarNovaCelebracao
};
