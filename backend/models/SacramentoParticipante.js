// backend/models/SacramentoParticipante.js
const pool = require('../config/db');

async function listarParticipantes(sacramentoId) {
  const result = await pool.query(
    `SELECT sp.paroquiano_id,
            p.nome,
            p.contacto,
            p.data_nascimento,
            sp.criado_em
       FROM sacramento_participantes sp
  LEFT JOIN paroquianos p ON p.id = sp.paroquiano_id
      WHERE sp.sacramento_id = $1
   ORDER BY p.nome ASC`,
    [sacramentoId]
  );
  return result.rows;
}

async function adicionarParticipante(sacramentoId, paroquianoId) {
  const result = await pool.query(
    `INSERT INTO sacramento_participantes (sacramento_id, paroquiano_id)
     VALUES ($1, $2)
     ON CONFLICT (sacramento_id, paroquiano_id) DO NOTHING
     RETURNING sacramento_id, paroquiano_id`,
    [sacramentoId, paroquianoId]
  );
  return result.rowCount > 0;
}

async function removerParticipante(sacramentoId, paroquianoId) {
  const result = await pool.query(
    `DELETE FROM sacramento_participantes
      WHERE sacramento_id = $1
        AND paroquiano_id = $2`,
    [sacramentoId, paroquianoId]
  );
  return result.rowCount > 0;
}

module.exports = {
  listarParticipantes,
  adicionarParticipante,
  removerParticipante,
};
