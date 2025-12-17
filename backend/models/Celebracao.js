// backend/models/Celebracao.js
const pool = require('../config/db');

// Permite reutilizar o mesmo client quando estivermos numa transacao
function getDb(db) {
  return db && typeof db.query === 'function' ? db : pool;
}

// LISTAR TODAS AS CELEBRACOES (para o dashboard e vista de gestao)
async function getTodasCelebracoes(db) {
  const client = getDb(db);
  const result = await client.query(
    `SELECT c.*,
            ce.nome AS celebrante_nome,
            (se.celebracao_id IS NOT NULL) AS is_especial,
            COALESCE(se.estado_confirmacao, 'pendente') AS estado_confirmacao
       FROM celebracoes c
  LEFT JOIN celebrantes ce ON c.celebrante_id = ce.id
  LEFT JOIN celebracoes_especiais se ON se.celebracao_id = c.id
   ORDER BY c.data ASC, c.hora ASC`
  );
  return result.rows;
}

async function getCelebracaoPorId(id, db) {
  const client = getDb(db);
  const result = await client.query(
    `SELECT c.*,
            (se.celebracao_id IS NOT NULL) AS is_especial,
            COALESCE(se.estado_confirmacao, 'pendente') AS estado_confirmacao
       FROM celebracoes c
  LEFT JOIN celebracoes_especiais se ON se.celebracao_id = c.id
      WHERE c.id = $1`,
    [id]
  );
  return result.rows[0];
}

// VERIFICAR SE JA EXISTE CELEBRACAO NESSA DATA/HORA (bool)
async function existeConflitoDataHora(data, hora, db) {
  const client = getDb(db);
  const result = await client.query(
    `SELECT 1
       FROM celebracoes
      WHERE data = $1
        AND hora = $2`,
    [data, hora]
  );
  return result.rowCount > 0;
}

// Saber se o celebrante tem flag especial
async function celebranteEhEspecial(celebranteId, db) {
  const client = getDb(db);
  const result = await client.query(
    'SELECT especial FROM celebrantes WHERE id = $1 LIMIT 1',
    [celebranteId]
  );
  const row = result.rows[0];
  return !!(row && row.especial);
}

// Verificar se o celebrante especial ja tem celebracao nessa data/hora
async function existeConflitoCelebranteEspecial(celebranteId, data, hora, db, ignorarId = null) {
  const client = getDb(db);
  const params = [celebranteId, data, hora];
  let sql = `
    SELECT 1
      FROM celebracoes
     WHERE celebrante_id = $1
       AND data = $2
       AND hora = $3`;

  if (ignorarId) {
    params.push(ignorarId);
    sql += ' AND id <> $4';
  }

  const result = await client.query(sql, params);
  return result.rowCount > 0;
}

async function marcarCelebracaoEspecial(celebracaoId, db) {
  const client = getDb(db);
  await client.query(
    `INSERT INTO celebracoes_especiais (celebracao_id)
     VALUES ($1)
     ON CONFLICT (celebracao_id) DO NOTHING`,
    [celebracaoId]
  );
}

async function removerCelebracaoEspecial(celebracaoId, db) {
  const client = getDb(db);
  await client.query('DELETE FROM celebracoes_especiais WHERE celebracao_id = $1', [celebracaoId]);
}

async function solicitarConfirmacaoCelebrante(celebracaoId, db) {
  const client = getDb(db);
  await client.query(
    `INSERT INTO celebracoes_especiais (celebracao_id)
     VALUES ($1)
     ON CONFLICT (celebracao_id) DO NOTHING`,
    [celebracaoId]
  );

  await client.query(
    `UPDATE celebracoes_especiais
        SET estado_confirmacao = 'pendente'
      WHERE celebracao_id = $1`,
    [celebracaoId]
  );
}

async function atualizarEstadoConfirmacaoCelebrante(celebracaoId, estado, db) {
  const estadosValidos = ['pendente', 'confirmado', 'recusado'];
  if (!estadosValidos.includes(estado)) {
    const err = new Error('Estado de confirmacao invalido.');
    err.code = 'ESTADO_INVALIDO';
    throw err;
  }

  const client = getDb(db);
  await client.query(
    `INSERT INTO celebracoes_especiais (celebracao_id)
     VALUES ($1)
     ON CONFLICT (celebracao_id) DO NOTHING`,
    [celebracaoId]
  );

  const result = await client.query(
    `UPDATE celebracoes_especiais
        SET estado_confirmacao = $2
      WHERE celebracao_id = $1
  RETURNING estado_confirmacao`,
    [celebracaoId, estado]
  );

  return result.rows[0] || null;
}

async function getConfirmacoesPendentesParaCelebrante(celebranteId, db) {
  const client = getDb(db);
  const result = await client.query(
    `SELECT c.id,
            c.data,
            c.hora,
            c.tipo,
            c.local,
            ce.nome AS celebrante_nome,
            COALESCE(se.estado_confirmacao, 'pendente') AS estado_confirmacao
       FROM celebracoes c
  INNER JOIN celebracoes_especiais se ON se.celebracao_id = c.id
  LEFT JOIN celebrantes ce ON ce.id = c.celebrante_id
      WHERE c.celebrante_id = $1
        AND COALESCE(se.estado_confirmacao, 'pendente') = 'pendente'
   ORDER BY c.data ASC, c.hora ASC`,
    [celebranteId]
  );
  return result.rows;
}

// OBTER CELEBRACAO NESSA DATA/HORA (para REQ-01.5)
async function getCelebracaoPorDataHora(data, hora, db) {
  const client = getDb(db);
  const result = await client.query(
    `SELECT c.*,
            ce.nome AS celebrante_nome,
            (se.celebracao_id IS NOT NULL) AS is_especial,
            COALESCE(se.estado_confirmacao, 'pendente') AS estado_confirmacao
       FROM celebracoes c
  LEFT JOIN celebrantes ce ON c.celebrante_id = ce.id
  LEFT JOIN celebracoes_especiais se ON se.celebracao_id = c.id
      WHERE c.data = $1
        AND c.hora = $2
      LIMIT 1`,
    [data, hora]
  );
  return result.rows[0] || null;
}

// LISTAR MISSAS POR DATA (REQ-07.3)
async function getMissasPorData(data, db) {
  const client = getDb(db);
  const result = await client.query(
    `SELECT c.*,
            ce.nome AS celebrante_nome
       FROM celebracoes c
  LEFT JOIN celebrantes ce ON c.celebrante_id = ce.id
      WHERE c.data = $1
        AND LOWER(c.tipo) LIKE '%missa%'
   ORDER BY c.hora ASC, c.id ASC`,
    [data]
  );
  return result.rows;
}

// CRIAR NOVA CELEBRACAO
async function criarCelebracao({ data, hora, tipo, local, celebranteId }) {
  if (!data || !hora || !tipo || !celebranteId) {
    const err = new Error('Data, hora, tipo e celebrante sao obrigatorios.');
    err.code = 'CAMPOS_OBRIGATORIOS';
    throw err;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const celebranteEspecial = await celebranteEhEspecial(celebranteId, client);

    // 1) Verificar conflito de agenda por data/hora
    const conflito = await existeConflitoDataHora(data, hora, client);
    if (conflito) {
      const err = new Error('Ja existe uma celebracao nesta data/hora.');
      err.code = 'CONFLITO_AGENDA';
      throw err;
    }

    // 2) Se celebrante for especial, validar disponibilidade dele para a data/hora
    if (celebranteEspecial) {
      const conflitoCelebrante = await existeConflitoCelebranteEspecial(
        celebranteId,
        data,
        hora,
        client
      );
      if (conflitoCelebrante) {
        const err = new Error('Celebrante especial indisponivel nesta data/hora.');
        err.code = 'CONFLITO_CELEBRANTE_ESPECIAL';
        throw err;
      }
    }

    // 3) Inserir na BD
    const result = await client.query(
      `INSERT INTO celebracoes (data, hora, tipo, local, celebrante_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data, hora, tipo, local || null, celebranteId]
    );

    const nova = result.rows[0];

    if (celebranteEspecial && nova) {
      await marcarCelebracaoEspecial(nova.id, client);
      nova.is_especial = true;
      nova.estado_confirmacao = 'pendente';
    } else if (nova) {
      nova.is_especial = false;
      nova.estado_confirmacao = null;
    }

    await client.query('COMMIT');
    return nova;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateCelebracao(id, { data, hora, tipo, local, celebranteId }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const celebranteEspecial = await celebranteEhEspecial(celebranteId, client);

    // Evitar conflitos com outras celebracoes na mesma data/hora
    const conflitoDataHora = await client.query(
      `SELECT 1 FROM celebracoes
        WHERE data = $1 AND hora = $2 AND id <> $3`,
      [data, hora, id]
    );
    if (conflitoDataHora.rowCount > 0) {
      const err = new Error('Ja existe outra celebracao nesta data/hora.');
      err.code = 'CONFLITO_AGENDA';
      throw err;
    }

    if (celebranteEspecial) {
      const conflitoCelebrante = await existeConflitoCelebranteEspecial(
        celebranteId,
        data,
        hora,
        client,
        id
      );
      if (conflitoCelebrante) {
        const err = new Error('Celebrante especial indisponivel nesta data/hora.');
        err.code = 'CONFLITO_CELEBRANTE_ESPECIAL';
        throw err;
      }
    }

    const result = await client.query(
      `UPDATE celebracoes
          SET data = $1,
              hora = $2,
              tipo = $3,
              local = $4,
              celebrante_id = $5
        WHERE id = $6
    RETURNING *`,
      [data, hora, tipo, local || null, celebranteId, id]
    );

    const atualizada = result.rows[0] || null;

    if (atualizada && celebranteEspecial) {
      await marcarCelebracaoEspecial(id, client);
      atualizada.is_especial = true;
      atualizada.estado_confirmacao = atualizada.estado_confirmacao || 'pendente';
    } else if (atualizada) {
      await removerCelebracaoEspecial(id, client);
      atualizada.is_especial = false;
      atualizada.estado_confirmacao = null;
    }

    await client.query('COMMIT');
    return atualizada;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteCelebracao(id) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await removerCelebracaoEspecial(id, client);
    const result = await client.query('DELETE FROM celebracoes WHERE id = $1', [id]);

    await client.query('COMMIT');
    return result.rowCount > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getTodasCelebracoes,
  criarCelebracao,
  getCelebracaoPorDataHora,
  getCelebracaoPorId,
  updateCelebracao,
  deleteCelebracao,
  celebranteEhEspecial,
  existeConflitoCelebranteEspecial,
  solicitarConfirmacaoCelebrante,
  atualizarEstadoConfirmacaoCelebrante,
  getConfirmacoesPendentesParaCelebrante,
  getMissasPorData,
};
