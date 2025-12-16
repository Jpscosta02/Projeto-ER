// backend/models/CelebracaoParticipante.js
const pool = require('../config/db');

async function listarParticipantes(celebracaoId) {
  const result = await pool.query(
    `SELECT cp.paroquiano_id,
            p.nome,
            p.contacto,
            p.data_nascimento,
            cp.criado_em
       FROM celebracao_participantes cp
  LEFT JOIN paroquianos p ON p.id = cp.paroquiano_id
      WHERE cp.celebracao_id = $1
   ORDER BY p.nome ASC`,
    [celebracaoId]
  );
  return result.rows;
}

async function adicionarParticipante(celebracaoId, paroquianoId) {
  const result = await pool.query(
    `INSERT INTO celebracao_participantes (celebracao_id, paroquiano_id)
     VALUES ($1, $2)
     ON CONFLICT (celebracao_id, paroquiano_id) DO NOTHING
     RETURNING celebracao_id, paroquiano_id`,
    [celebracaoId, paroquianoId]
  );
  return result.rowCount > 0;
}

async function removerParticipante(celebracaoId, paroquianoId) {
  const result = await pool.query(
    `DELETE FROM celebracao_participantes
      WHERE celebracao_id = $1
        AND paroquiano_id = $2`,
    [celebracaoId, paroquianoId]
  );
  return result.rowCount > 0;
}

module.exports = {
  listarParticipantes,
  adicionarParticipante,
  removerParticipante,
};
