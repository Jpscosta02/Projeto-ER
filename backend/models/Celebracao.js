// backend/models/Celebracao.js
const pool = require('../config/db');

// Lista todas as celebrações (para o calendário / próximas celebrações)
async function getTodasCelebracoes() {
  const result = await pool.query(
    'SELECT * FROM celebracoes ORDER BY data ASC, hora ASC'
  );
  return result.rows;
}

// Verifica se já existe celebração na mesma data/hora (e opcionalmente local)
async function getConflitosPorDataHoraLocal(data, hora, local) {
  const result = await pool.query(
    `SELECT id
       FROM celebracoes
      WHERE data = $1
        AND hora = $2
        AND ($3 IS NULL OR local = $3)`,
    [data, hora, local || null]
  );
  return result.rows;
}

// Cria uma nova celebração
async function criarCelebracao({ data, hora, tipo, local, celebranteId }) {
  const result = await pool.query(
    `INSERT INTO celebracoes (data, hora, tipo, local, celebrante_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data, hora, tipo, local || null, celebranteId]
  );
  return result.rows[0];
}

module.exports = {
  getTodasCelebracoes,
  getConflitosPorDataHoraLocal,
  criarCelebracao
};