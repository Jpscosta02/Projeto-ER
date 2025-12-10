// backend/controllers/authController.js
const { obterPorEmail, criarParoquiano } = require('../models/Utilizador');
const { bootId } = require('../boot');

async function registarParoquiano(req, res) {
  try {
    const { nome, email, password, data_nascimento } = req.body || {};
    if (!nome || !email || !password || !data_nascimento) {
      return res.status(400).json({ mensagem: 'Nome, email, data de nascimento e password são obrigatórios.' });
    }

    const existente = await obterPorEmail(email);
    if (existente) {
      return res.status(409).json({ mensagem: 'Email já registado.' });
    }

    const novo = await criarParoquiano({ nome, email, password, data_nascimento });
    if (!novo) {
      return res.status(500).json({ mensagem: 'Não foi possível criar utilizador.' });
    }

    res.status(201).json({ id: novo.id, nome: novo.nome, email: novo.email, role: novo.role || 'paroquiano', bootId });
  } catch (err) {
    console.error('Erro no registo:', err);
    res.status(500).json({ mensagem: 'Erro ao registar utilizador.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ mensagem: 'Email e password são obrigatórios.' });
    }

    const user = await obterPorEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
    }

    res.json({ id: user.id, nome: user.nome, email: user.email, role: user.role || 'paroquiano', bootId });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ mensagem: 'Erro ao autenticar.' });
  }
}

module.exports = {
  registarParoquiano,
  login,
};
