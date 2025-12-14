// backend/controllers/celebracoesController.js
const {
  getTodasCelebracoes,
  getCelebracaoPorId,
  getCelebracaoPorDataHora,
  criarCelebracao,
  updateCelebracao,
  deleteCelebracao,
  celebranteEhEspecial,
  existeConflitoCelebranteEspecial,
  solicitarConfirmacaoCelebrante,
  atualizarEstadoConfirmacaoCelebrante,
} = require('../models/Celebracao');

// GET /api/celebracoes
async function listarCelebracoes(req, res) {
  try {
    const dados = await getTodasCelebracoes();
    return res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar celebracoes:', err);
    return res.status(500).json({ error: 'Erro ao buscar celebracoes' });
  }
}

// POST /api/celebracoes
async function criarNovaCelebracao(req, res) {
  console.log('BODY RECEBIDO NO POST /celebracoes:', req.body);

  const { data, hora, tipo, local, celebranteId } = req.body;

  if (!data || !hora || !tipo || !celebranteId) {
    console.warn('Campos em falta ao criar celebracao:', {
      data: !data,
      hora: !hora,
      tipo: !tipo,
      celebranteId: !celebranteId,
    });

    return res.status(400).json({
      mensagem: 'Data, hora, tipo e celebrante sao obrigatorios.',
    });
  }

  try {
    const nova = await criarCelebracao({ data, hora, tipo, local, celebranteId });

    console.log(`[LOG] Celebracao criada (id=${nova.id}) em ${nova.data} as ${nova.hora}.`);

    return res.status(201).json(nova);
  } catch (err) {
    console.error('Erro ao criar celebracao:', err);

    if (err.code === 'CONFLITO_AGENDA' || err.code === 'CONFLITO_CELEBRANTE_ESPECIAL') {
      return res.status(409).json({ mensagem: err.message });
    }

    if (err.code === 'CAMPOS_OBRIGATORIOS') {
      return res.status(400).json({ mensagem: err.message });
    }

    return res.status(500).json({ mensagem: 'Erro ao criar celebracao.' });
  }
}

// GET /api/celebracoes/disponibilidade?data=YYYY-MM-DD&hora=HH:MM[&celebranteId=...]
async function verificarDisponibilidadeCelebracao(req, res) {
  const { data, hora, celebranteId } = req.query;

  if (!data || !hora) {
    return res.status(400).json({
      mensagem: 'Data e hora sao obrigatorias para verificar disponibilidade.',
    });
  }

  try {
    const celebracao = await getCelebracaoPorDataHora(data, hora);
    const celebranteIdNum = celebranteId ? Number(celebranteId) : null;
    const celebranteEspecial =
      celebranteIdNum && !Number.isNaN(celebranteIdNum)
        ? await celebranteEhEspecial(celebranteIdNum)
        : false;

    let celebranteDisponivel = true;
    if (celebranteEspecial && celebranteIdNum && !Number.isNaN(celebranteIdNum)) {
      const conflito = await existeConflitoCelebranteEspecial(celebranteIdNum, data, hora);
      celebranteDisponivel = !conflito;
    }

    if (!celebracao) {
      return res.json({
        disponivel: true,
        celebranteEspecial,
        celebranteDisponivel,
      });
    }

    return res.json({
      disponivel: false,
      celebracao,
      celebranteEspecial,
      celebranteDisponivel,
    });
  } catch (err) {
    console.error('Erro ao verificar disponibilidade de celebracao:', err);
    return res.status(500).json({ mensagem: 'Erro ao verificar disponibilidade.' });
  }
}

// POST /api/celebracoes/:id/confirmacao/solicitar
async function solicitarConfirmacao(req, res) {
  const { id } = req.params;

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ mensagem: 'ID invalido.' });
  }

  try {
    const celebracao = await getCelebracaoPorId(id);
    if (!celebracao) {
      return res.status(404).json({ mensagem: 'Celebracao nao encontrada.' });
    }

    if (!celebracao.is_especial) {
      return res.status(400).json({ mensagem: 'A confirmacao aplica-se apenas a celebracoes especiais.' });
    }

    await solicitarConfirmacaoCelebrante(id);
    return res.json({ estado_confirmacao: 'pendente' });
  } catch (err) {
    console.error('Erro ao solicitar confirmacao do celebrante:', err);
    return res.status(500).json({ mensagem: 'Erro ao solicitar confirmacao.' });
  }
}

// POST /api/celebracoes/:id/confirmacao  { estado: 'confirmado' | 'pendente' | 'recusado' }
async function atualizarEstadoConfirmacao(req, res) {
  const { id } = req.params;
  const { estado } = req.body || {};

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ mensagem: 'ID invalido.' });
  }

  if (!estado) {
    return res.status(400).json({ mensagem: 'Estado obrigatorio.' });
  }

  try {
    const celebracao = await getCelebracaoPorId(id);
    if (!celebracao) {
      return res.status(404).json({ mensagem: 'Celebracao nao encontrada.' });
    }

    if (!celebracao.is_especial) {
      return res.status(400).json({ mensagem: 'A confirmacao aplica-se apenas a celebracoes especiais.' });
    }

    const atualizado = await atualizarEstadoConfirmacaoCelebrante(id, estado);
    if (!atualizado) {
      return res.status(500).json({ mensagem: 'Nao foi possivel atualizar confirmacao.' });
    }

    return res.json({ estado_confirmacao: atualizado.estado_confirmacao || estado });
  } catch (err) {
    console.error('Erro ao atualizar confirmacao:', err);
    if (err.code === 'ESTADO_INVALIDO') {
      return res.status(400).json({ mensagem: err.message });
    }
    return res.status(500).json({ mensagem: 'Erro ao atualizar confirmacao.' });
  }
}

// --------- FUNCOES AUXILIARES PARA NORMALIZAR DATA/HORA ---------
function normalizarDataValor(valor) {
  if (!valor) return null;
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  return String(valor).slice(0, 10);
}

function normalizarHoraValor(valor) {
  if (!valor) return null;
  return String(valor).slice(0, 5); // HH:MM
}

// PUT /api/celebracoes/:id
async function atualizarCelebracao(req, res) {
  const { id } = req.params;
  const { data, hora, tipo, celebranteId, local } = req.body;

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ mensagem: 'ID invalido.' });
  }

  if (!data || !hora || !tipo || !celebranteId) {
    return res.status(400).json({
      mensagem: 'Data, hora, tipo e celebrante sao obrigatorios para atualizar.',
    });
  }

  try {
    const existente = await getCelebracaoPorId(id);
    if (!existente) {
      return res.status(404).json({ mensagem: 'Celebracao nao encontrada.' });
    }

    const dataExistenteNorm = normalizarDataValor(existente.data);
    const horaExistenteNorm = normalizarHoraValor(existente.hora);
    const dataNovaNorm = normalizarDataValor(data);
    const horaNovaNorm = normalizarHoraValor(hora);

    // Mantem a verificacao de conflito de data/hora (sem considerar celebrante)
    const alterouDataHora =
      dataExistenteNorm !== dataNovaNorm || horaExistenteNorm !== horaNovaNorm;

    if (alterouDataHora) {
      const conflito = await getCelebracaoPorDataHora(dataNovaNorm, horaNovaNorm);
      if (conflito && Number(conflito.id) !== Number(id)) {
        return res
          .status(409)
          .json({ mensagem: 'Ja existe outra celebracao nesta data/hora.' });
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
      return res.status(500).json({ mensagem: 'Nao foi possivel atualizar a celebracao.' });
    }

    console.log(
      `[LOG] Celebracao ID=${id} foi alterada. Nova data=${dataNovaNorm}, hora=${horaNovaNorm}, tipo=${tipo}, celebranteId=${celebranteId}, local=${local}.`
    );

    return res.json(atualizada);
  } catch (err) {
    console.error('Erro ao atualizar celebracao:', err);

    if (err.code === 'CONFLITO_AGENDA' || err.code === 'CONFLITO_CELEBRANTE_ESPECIAL') {
      return res.status(409).json({ mensagem: err.message });
    }

    return res.status(500).json({ mensagem: 'Erro ao atualizar celebracao.' });
  }
}

// DELETE /api/celebracoes/:id
async function removerCelebracao(req, res) {
  const { id } = req.params;

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ mensagem: 'ID invalido.' });
  }

  try {
    const existente = await getCelebracaoPorId(id);
    if (!existente) {
      return res.status(404).json({ mensagem: 'Celebracao nao encontrada.' });
    }

    const apagou = await deleteCelebracao(id);
    if (!apagou) {
      return res.status(500).json({ mensagem: 'Nao foi possivel remover a celebracao.' });
    }

    console.log(`[LOG] Celebracao ID=${id} removida.`);
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao remover celebracao:', err);
    return res.status(500).json({ mensagem: 'Erro ao remover celebracao.' });
  }
}

module.exports = {
  listarCelebracoes,
  criarNovaCelebracao,
  verificarDisponibilidadeCelebracao,
  atualizarCelebracao,
  removerCelebracao,
  solicitarConfirmacao,
  atualizarEstadoConfirmacao,
};
