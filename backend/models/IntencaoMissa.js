// backend/models/IntencaoMissa.js
const pool = require('../config/db');

async function criarIntencaoMissa({
  nome,
  intencao,
  dataPretendida,
  solicitanteEmail = null,
  celebracaoId = null,
}) {
  const result = await pool.query(
    `INSERT INTO intencoes_missa (nome, intencao, data_pretendida, estado, solicitante_email, celebracao_id)
     VALUES ($1, $2, $3, 'pendente', $4, $5)
     RETURNING *`,
    [nome, intencao, dataPretendida, solicitanteEmail, celebracaoId]
  );
  return result.rows[0] || null;
}

async function getIntencaoMissaPorId(id) {
  const result = await pool.query('SELECT * FROM intencoes_missa WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function listarIntencoesMissa({ estado = null } = {}) {
  if (estado) {
    const result = await pool.query(
      `SELECT *
         FROM intencoes_missa
        WHERE estado = $1
     ORDER BY criado_em DESC, id DESC`,
      [estado]
    );
    return result.rows;
  }

  const result = await pool.query(
    `SELECT *
       FROM intencoes_missa
   ORDER BY criado_em DESC, id DESC`
  );
  return result.rows;
}

async function decidirIntencaoMissa(id, { estado, motivo = null }) {
  const result = await pool.query(
    `UPDATE intencoes_missa
        SET estado = $2,
            decisao_motivo = $3,
            decidido_em = NOW()
      WHERE id = $1
  RETURNING *`,
    [id, estado, motivo]
  );
  return result.rows[0] || null;
}

async function listarDecisoesNaoNotificadasPorEmail(email) {
  const result = await pool.query(
    `SELECT *
       FROM intencoes_missa
      WHERE solicitante_email = $1
        AND estado <> 'pendente'
        AND notificado_em IS NULL
   ORDER BY decidido_em DESC, id DESC`,
    [email]
  );
  return result.rows;
}

async function marcarIntencaoNotificada(id) {
  const result = await pool.query(
    `UPDATE intencoes_missa
        SET notificado_em = NOW()
      WHERE id = $1
        AND estado <> 'pendente'
  RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

async function listarIntencoesAprovadasPorCelebracao(celebracaoId) {
  const result = await pool.query(
    `SELECT id,
            nome,
            intencao,
            data_pretendida,
            celebracao_id,
            decidido_em
       FROM intencoes_missa
      WHERE celebracao_id = $1
        AND estado = 'aprovada'
   ORDER BY decidido_em ASC NULLS LAST, id ASC`,
    [celebracaoId]
  );
  return result.rows;
}

module.exports = {
  criarIntencaoMissa,
  getIntencaoMissaPorId,
  listarIntencoesMissa,
  decidirIntencaoMissa,
  listarDecisoesNaoNotificadasPorEmail,
  marcarIntencaoNotificada,
  listarIntencoesAprovadasPorCelebracao,
};
