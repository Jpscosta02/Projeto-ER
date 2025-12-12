// backend/controllers/celebracoesController.js
const {
  getTodasCelebracoes,
  getCelebracaoPorId,
  getCelebracaoPorDataHora,
  criarCelebracao,
  updateCelebracao,
  deleteCelebracao
} = require('../models/Celebracao');

// GET /api/celebracoes
async function listarCelebracoes(req, res) {
  try {
    const dados = await getTodasCelebracoes();
    return res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar celebrações:', err);
    return res.status(500).json({ error: 'Erro ao buscar celebrações' });
  }
}

// POST /api/celebracoes
async function criarNovaCelebracao(req, res) {
  console.log('BODY RECEBIDO NO POST /celebracoes:', req.body);

  const { data, hora, tipo, local, celebranteId } = req.body;

  if (!data || !hora || !tipo || !celebranteId) {
    console.warn('Campos em falta ao criar celebração:', {
      data: !data,
      hora: !hora,
      tipo: !tipo,
      celebranteId: !celebranteId,
    });

    return res.status(400).json({
      mensagem: 'Data, hora, tipo e celebrante são obrigatórios.',
    });
  }

  try {
    const nova = await criarCelebracao({ data, hora, tipo, local, celebranteId });

    console.log(`[LOG] Celebração criada (id=${nova.id}) em ${nova.data} às ${nova.hora}.`);

    return res.status(201).json(nova);
  } catch (err) {
    console.error('Erro ao criar celebração:', err);

    if (err.code === 'CONFLITO_AGENDA') {
      return res.status(409).json({ mensagem: err.message });
    }

    if (err.code === 'CAMPOS_OBRIGATORIOS') {
      return res.status(400).json({ mensagem: err.message });
    }

    return res.status(500).json({ mensagem: 'Erro ao criar celebração.' });
  }
}

// GET /api/celebracoes/disponibilidade?data=YYYY-MM-DD&hora=HH:MM
async function verificarDisponibilidadeCelebracao(req, res) {
  const { data, hora } = req.query;

  if (!data || !hora) {
    return res.status(400).json({
      mensagem: 'Data e hora são obrigatórias para verificar disponibilidade.',
    });
  }

  try {
    const celebracao = await getCelebracaoPorDataHora(data, hora);

    if (!celebracao) {
      return res.json({ disponivel: true });
    }

    return res.json({
      disponivel: false,
      celebracao,
    });
  } catch (err) {
    console.error('Erro ao verificar disponibilidade de celebração:', err);
    return res.status(500).json({ mensagem: 'Erro ao verificar disponibilidade.' });
  }
}

// --------- FUNÇÕES AUXILIARES PARA NORMALIZAR DATA/HORA ---------
function normalizarDataValor(valor) {
  if (!valor) return null;
  // Se vier Date do PG
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  // Se vier string já em YYYY-MM-DD ou ISO, cortamos
  return String(valor).slice(0, 10);
}

function normalizarHoraValor(valor) {
  if (!valor) return null;
  // Hora pode vir "HH:MM" ou "HH:MM:SS", ficamos só com "HH:MM"
  return String(valor).slice(0, 5);
}

// PUT /api/celebracoes/:id
async function atualizarCelebracao(req, res) {
  const { id } = req.params;
  const { data, hora, tipo, celebranteId, local } = req.body;

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ mensagem: 'ID inválido.' });
  }

  if (!data || !hora || !tipo || !celebranteId) {
    return res.status(400).json({
      mensagem: 'Data, hora, tipo e celebrante são obrigatórios para atualizar.',
    });
  }

  try {
    const existente = await getCelebracaoPorId(id);
    if (!existente) {
      return res.status(404).json({ mensagem: 'Celebração não encontrada.' });
    }

    // Normalizar valores antigos e novos
    const dataExistenteNorm = normalizarDataValor(existente.data);
    const horaExistenteNorm = normalizarHoraValor(existente.hora);

    const dataNovaNorm = normalizarDataValor(data);
    const horaNovaNorm = normalizarHoraValor(hora);

    // Ver se o utilizador MUDOU mesmo a data/hora
    const alterouDataHora =
      dataExistenteNorm !== dataNovaNorm || horaExistenteNorm !== horaNovaNorm;

    if (alterouDataHora) {
      // Só aqui verificamos conflito com outras celebrações
      const conflito = await getCelebracaoPorDataHora(dataNovaNorm, horaNovaNorm);
      if (conflito && Number(conflito.id) !== Number(id)) {
        return res
          .status(409)
          .json({ mensagem: 'Já existe outra celebração nesta data/hora.' });
      }
    }

    const atualizada = await updateCelebracao(id, {
      data: dataNovaNorm,
      hora: horaNovaNorm,
      tipo,
      local,
      celebranteId,
    });

    if (!atualizada) {
      return res.status(500).json({ mensagem: 'Não foi possível atualizar a celebração.' });
    }

    console.log(
      `[LOG] Celebração ID=${id} foi alterada. Nova data=${dataNovaNorm}, hora=${horaNovaNorm}, tipo=${tipo}, celebranteId=${celebranteId}, local=${local}.`
    );

    return res.json(atualizada);
  } catch (err) {
    console.error('Erro ao atualizar celebração:', err);
    return res.status(500).json({ mensagem: 'Erro ao atualizar celebração.' });
  }
}

// DELETE /api/celebracoes/:id
async function removerCelebracao(req, res) {
  const { id } = req.params;

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ mensagem: 'ID inv lido.' });
  }

  try {
    const existente = await getCelebracaoPorId(id);
    if (!existente) {
      return res.status(404).json({ mensagem: 'Celebra‡Æo nÆo encontrada.' });
    }

    const apagou = await deleteCelebracao(id);
    if (!apagou) {
      return res.status(500).json({ mensagem: 'NÆo foi poss¡vel remover a celebra‡Æo.' });
    }

    console.log(`[LOG] Celebra‡Æo ID=${id} removida.`);
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao remover celebra‡Æo:', err);
    return res.status(500).json({ mensagem: 'Erro ao remover celebra‡Æo.' });
  }
}

module.exports = {
  listarCelebracoes,
  criarNovaCelebracao,
  verificarDisponibilidadeCelebracao,
  atualizarCelebracao,
  removerCelebracao,
};
