// backend/controllers/celebracoesController.js
const {
  getTodasCelebracoes,
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
async function criarNovaCelebracao(req, res) {
  // Só para debug
  console.log('BODY RECEBIDO NO POST /celebracoes:', req.body);

  const { data, hora, tipo, local, celebranteId } = req.body;

  // 1) Validação de campos obrigatórios
  if (!data || !hora || !tipo || !celebranteId) {
    console.warn('Campos em falta:', {
      data: !data,
      hora: !hora,
      tipo: !tipo,
      celebranteId: !celebranteId
    });

    return res.status(400).json({
      mensagem: 'Data, hora, tipo e celebrante são obrigatórios.'
    });
  }

  try {
    // 2) Delegar no model (que trata do conflito data/hora e do INSERT)
    const nova = await criarCelebracao({ data, hora, tipo, local, celebranteId });
    return res.status(201).json(nova);

  } catch (err) {
    console.error('Erro ao criar celebração:', err);

    // Conflito de agenda (data/hora ocupadas)
    if (err.code === 'CONFLITO_AGENDA') {
      return res.status(409).json({ mensagem: err.message });
    }

    // Outros erros (SQL, etc.)
    return res.status(500).json({ mensagem: 'Erro ao criar celebração.' });
  }
}

module.exports = {
  listarCelebracoes,
  criarNovaCelebracao
};
