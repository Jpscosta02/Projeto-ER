// backend/controllers/sacramentosController.js
const {
  getTodosSacramentos,
  getSacramentoPorId,
  getSacramentoPorDataHora,
  criarSacramento,
  updateSacramento,
  deleteSacramento,
} = require('../models/Sacramento');
const {
  listarParticipantes,
  adicionarParticipante,
  removerParticipante,
} = require('../models/SacramentoParticipante');

async function listarSacramentos(req, res) {
  try {
    const dados = await getTodosSacramentos();
    return res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar sacramentos:', err);
    return res.status(500).json({ mensagem: 'Erro ao buscar sacramentos' });
  }
}

async function criarNovoSacramento(req, res) {
  const { data, hora, tipo, local, celebranteId } = req.body || {};
  if (!data || !hora || !tipo || !celebranteId) {
    return res.status(400).json({ mensagem: 'Data, hora, tipo e celebrante sao obrigatorios.' });
  }
  try {
    const dataNorm = normalizarData(data);
    const horaNorm = normalizarHora(hora);
    const novo = await criarSacramento({ data: dataNorm, hora: horaNorm, tipo, local, celebranteId });
    return res.status(201).json(novo);
  } catch (err) {
    // Erros de regra de negocio nao devem poluir os logs como erro
    if (err.code === 'CONFLITO_AGENDA') {
      // Conflito de data/hora esperado em duplicidade
      return res.status(409).json({ mensagem: err.message });
    }
    if (err.code === 'CAMPOS_OBRIGATORIOS') {
      // Validacao de entrada
      return res.status(400).json({ mensagem: err.message });
    }
    // Erro inesperado
    console.error('Erro ao criar sacramento:', err);
    return res.status(500).json({ mensagem: 'Erro ao criar sacramento.' });
  }
}

async function verificarDisponibilidadeSacramento(req, res) {
  const { data, hora } = req.query || {};
  if (!data || !hora) {
    return res.status(400).json({ mensagem: 'Data e hora obrigatorias.' });
  }
  try {
    const dataNorm = normalizarData(data);
    const horaNorm = normalizarHora(hora);
    const existente = await getSacramentoPorDataHora(dataNorm, horaNorm);
    if (!existente) {
      return res.json({ disponivel: true });
    }
    return res.json({ disponivel: false, sacramento: existente });
  } catch (err) {
    console.error('Erro ao verificar disponibilidade do sacramento:', err);
    return res.status(500).json({ mensagem: 'Erro ao verificar disponibilidade.' });
  }
}

function normalizarData(valor){
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0,10);
  return String(valor).slice(0,10);
}
function normalizarHora(valor){
  if (!valor) return null;
  return String(valor).slice(0,5);
}

async function atualizarSacramento(req, res) {
  const { id } = req.params;
  const { data, hora, tipo, local, celebranteId } = req.body || {};
  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ mensagem: 'ID invalido.' });
  }
  if (!data || !hora || !tipo || !celebranteId) {
    return res.status(400).json({ mensagem: 'Campos obrigatorios em falta.' });
  }
  try {
    const existente = await getSacramentoPorId(id);
    if (!existente) return res.status(404).json({ mensagem: 'Sacramento nao encontrado.' });

    const dataNorm = normalizarData(data);
    const horaNorm = normalizarHora(hora);
    const conflito = await getSacramentoPorDataHora(dataNorm, horaNorm);
    if (conflito && Number(conflito.id) !== Number(id)) {
      return res.status(409).json({ mensagem: 'Ja existe outro sacramento nesta data/hora.' });
    }

    const atualizado = await updateSacramento(id, { data: dataNorm, hora: horaNorm, tipo, local, celebranteId });
    if (!atualizado) return res.status(500).json({ mensagem: 'Falha ao atualizar sacramento.' });
    return res.json(atualizado);
  } catch (err) {
    // Evitar logs de erro para conflitos esperados
    if (err.code === 'CONFLITO_AGENDA') {
      return res.status(409).json({ mensagem: err.message });
    }
    console.error('Erro ao atualizar sacramento:', err);
    return res.status(500).json({ mensagem: 'Erro ao atualizar sacramento.' });
  }
}

async function removerSacramento(req, res) {
  const { id } = req.params;
  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ mensagem: 'ID invalido.' });
  }
  try {
    const existente = await getSacramentoPorId(id);
    if (!existente) return res.status(404).json({ mensagem: 'Sacramento nao encontrado.' });
    const apagou = await deleteSacramento(id);
    if (!apagou) return res.status(500).json({ mensagem: 'Nao foi possivel remover.' });
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao remover sacramento:', err);
    return res.status(500).json({ mensagem: 'Erro ao remover sacramento.' });
  }
}

async function listarParticipantesSacramento(req, res) {
  const { id } = req.params;
  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ mensagem: 'ID invalido.' });
  }
  try {
    const existe = await getSacramentoPorId(id);
    if (!existe) return res.status(404).json({ mensagem: 'Sacramento nao encontrado.' });
    const lista = await listarParticipantes(id);
    return res.json(lista);
  } catch (err) {
    console.error('Erro ao listar participantes do sacramento:', err);
    return res.status(500).json({ mensagem: 'Erro ao listar participantes.' });
  }
}

async function adicionarParticipanteSacramento(req, res) {
  const { id } = req.params;
  const { paroquianoId } = req.body || {};
  if (!id || Number.isNaN(Number(id)) || !paroquianoId || Number.isNaN(Number(paroquianoId))) {
    return res.status(400).json({ mensagem: 'IDs invalidos.' });
  }
  try {
    const existe = await getSacramentoPorId(id);
    if (!existe) return res.status(404).json({ mensagem: 'Sacramento nao encontrado.' });
    const ok = await adicionarParticipante(id, paroquianoId);
    if (!ok) return res.status(409).json({ mensagem: 'Participante ja inscrito.' });
    return res.status(201).json({ sacramentoId: id, paroquianoId });
  } catch (err) {
    console.error('Erro ao adicionar participante no sacramento:', err);
    return res.status(500).json({ mensagem: 'Erro ao adicionar participante.' });
  }
}

async function removerParticipanteSacramento(req, res) {
  const { id, paroquianoId } = req.params;
  if (!id || Number.isNaN(Number(id)) || !paroquianoId || Number.isNaN(Number(paroquianoId))) {
    return res.status(400).json({ mensagem: 'IDs invalidos.' });
  }
  try {
    const existe = await getSacramentoPorId(id);
    if (!existe) return res.status(404).json({ mensagem: 'Sacramento nao encontrado.' });
    const ok = await removerParticipante(id, paroquianoId);
    if (!ok) return res.status(404).json({ mensagem: 'Participante nao encontrado no sacramento.' });
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao remover participante no sacramento:', err);
    return res.status(500).json({ mensagem: 'Erro ao remover participante.' });
  }
}

module.exports = {
  listarSacramentos,
  criarNovoSacramento,
  verificarDisponibilidadeSacramento,
  atualizarSacramento,
  removerSacramento,
  listarParticipantesSacramento,
  adicionarParticipanteSacramento,
  removerParticipanteSacramento,
};
