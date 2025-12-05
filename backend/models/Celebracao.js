// backend/models/Celebracao.js
const pool = require('../config/db');

// LISTAR TODAS AS CELEBRAÇÕES (para o dashboard e vista de gestão)
async function getTodasCelebracoes() {
  const result = await pool.query(
    `SELECT c.*,
            ce.nome AS celebrante_nome
     FROM celebracoes c
     LEFT JOIN celebrantes ce ON c.celebrante_id = ce.id
     ORDER BY c.data ASC, c.hora ASC`
  );
  return result.rows;
}

// VERIFICAR SE JÁ EXISTE CELEBRAÇÃO NESSA DATA/HORA
async function existeConflitoDataHora(data, hora) {
  const result = await pool.query(
    `SELECT 1
       FROM celebracoes
      WHERE data = $1
        AND hora = $2`,
    [data, hora]
  );
  return result.rowCount > 0;
}

// CRIAR NOVA CELEBRAÇÃO
async function criarCelebracao({ data, hora, tipo, local, celebranteId }) {
  // validação mínima aqui (opcional, já fazes no controller)
  if (!data || !hora || !tipo || !celebranteId) {
    const err = new Error('Data, hora, tipo e celebrante são obrigatórios.');
    err.code = 'CAMPOS_OBRIGATORIOS';
    throw err;
  }

  // 1) Verificar conflito de agenda por data/hora
  const conflito = await existeConflitoDataHora(data, hora);
  if (conflito) {
    const err = new Error('Já existe uma celebração nesta data/hora.');
    err.code = 'CONFLITO_AGENDA';
    throw err;
  }

  // 2) Inserir na BD
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
  criarCelebracao
};
