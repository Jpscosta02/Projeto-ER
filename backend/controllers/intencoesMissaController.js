// backend/controllers/intencoesMissaController.js
const {
  criarIntencaoMissa,
  getIntencaoMissaPorId,
  listarIntencoesMissa,
  decidirIntencaoMissa,
  listarDecisoesNaoNotificadasPorEmail,
  marcarIntencaoNotificada,
} = require('../models/IntencaoMissa');
const { getCelebracaoPorId } = require('../models/Celebracao');

function normalizarDataIso(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  const raw = String(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

async function submeterIntencaoMissa(req, res) {
  const { nome, intencao, dataPretendida, solicitanteEmail, celebracaoId } = req.body || {};

  if (!nome || !intencao) {
    return res.status(400).json({
      mensagem: 'Nome e intencao sao obrigatorios.',
    });
  }

  try {
    let celebracaoIdFinal = celebracaoId ? Number(celebracaoId) : null;

    if (celebracaoIdFinal && Number.isNaN(celebracaoIdFinal)) {
      return res.status(400).json({ mensagem: 'Celebracao invalida.' });
    }

    if (!celebracaoIdFinal) {
      return res.status(400).json({ mensagem: 'Selecione uma missa.' });
    }

    const celebracao = await getCelebracaoPorId(celebracaoIdFinal);
    if (!celebracao) {
      return res.status(400).json({ mensagem: 'Missa nao encontrada.' });
    }

    const tipo = String(celebracao.tipo || '').toLowerCase();
    if (!tipo.includes('missa') && !tipo.includes('eucar')) {
      return res.status(400).json({ mensagem: 'A celebracao selecionada nao e uma missa.' });
    }

    const dataCelebracao = normalizarDataIso(celebracao.data);
    const dataNorm = normalizarDataIso(dataPretendida) || dataCelebracao;

    if (!dataNorm) {
      return res.status(400).json({ mensagem: 'Nao foi possivel determinar a data pretendida.' });
    }

    const nova = await criarIntencaoMissa({
      nome,
      intencao,
      dataPretendida: dataNorm,
      solicitanteEmail,
      celebracaoId: celebracaoIdFinal,
    });
    return res.status(201).json(nova);
  } catch (err) {
    console.error('Erro ao submeter intencao de missa:', err);
    return res.status(500).json({ mensagem: 'Erro ao submeter intencao de missa.' });
  }
}

async function listarIntencoes(req, res) {
  const { estado } = req.query || {};
  try {
    const lista = await listarIntencoesMissa({ estado: estado || null });
    return res.json(lista);
  } catch (err) {
    console.error('Erro ao listar intencoes de missa:', err);
    return res.status(500).json({ mensagem: 'Erro ao listar intencoes de missa.' });
  }
}

async function decidirIntencao(req, res) {
  const { id } = req.params;
  const { estado, motivo } = req.body || {};

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ mensagem: 'ID invalido.' });
  }

  const estadoNorm = String(estado || '').toLowerCase();
  const estadosValidos = ['aprovada', 'rejeitada'];
  if (!estadosValidos.includes(estadoNorm)) {
    return res.status(400).json({ mensagem: 'Estado invalido (aprovada|rejeitada).' });
  }

  try {
    const existente = await getIntencaoMissaPorId(Number(id));
    if (!existente) {
      return res.status(404).json({ mensagem: 'Intencao nao encontrada.' });
    }

    if (String(existente.estado || '').toLowerCase() !== 'pendente') {
      return res.status(409).json({ mensagem: 'Esta intencao ja foi decidida.' });
    }

    if (estadoNorm === 'aprovada') {
      const falta =
        !existente.nome ||
        !existente.intencao ||
        !existente.data_pretendida ||
        !existente.celebracao_id;
      if (falta) {
        return res.status(400).json({ mensagem: 'Nao e possivel aprovar: falta informacao obrigatoria.' });
      }

      const celebracao = await getCelebracaoPorId(Number(existente.celebracao_id));
      if (!celebracao) {
        return res.status(400).json({ mensagem: 'Nao e possivel aprovar: missa associada nao existe.' });
      }

      const tipo = String(celebracao.tipo || '').toLowerCase();
      if (!tipo.includes('missa') && !tipo.includes('eucar')) {
        return res.status(400).json({ mensagem: 'Nao e possivel aprovar: celebracao associada nao e uma missa.' });
      }

    }

    const atualizada = await decidirIntencaoMissa(Number(id), {
      estado: estadoNorm,
      motivo: motivo || null,
    });

    return res.json(atualizada);
  } catch (err) {
    console.error('Erro ao decidir intencao de missa:', err);
    return res.status(500).json({ mensagem: 'Erro ao atualizar decisao.' });
  }
}

async function listarMinhasDecisoes(req, res) {
  const { email } = req.query || {};
  if (!email) return res.status(400).json({ mensagem: 'Email obrigatorio.' });

  try {
    const lista = await listarDecisoesNaoNotificadasPorEmail(String(email));
    return res.json(lista);
  } catch (err) {
    console.error('Erro ao listar decisoes de intencoes:', err);
    return res.status(500).json({ mensagem: 'Erro ao listar decisoes.' });
  }
}

async function marcarNotificado(req, res) {
  const { id } = req.params;
  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ mensagem: 'ID invalido.' });
  }

  try {
    const atualizada = await marcarIntencaoNotificada(Number(id));
    if (!atualizada) return res.status(404).json({ mensagem: 'Intencao nao encontrada.' });
    return res.json(atualizada);
  } catch (err) {
    console.error('Erro ao marcar intencao como notificada:', err);
    return res.status(500).json({ mensagem: 'Erro ao marcar notificada.' });
  }
}

module.exports = {
  submeterIntencaoMissa,
  listarIntencoes,
  decidirIntencao,
  listarMinhasDecisoes,
  marcarNotificado,
};
