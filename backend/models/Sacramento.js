// backend/models/Sacramento.js
const pool = require('../config/db');

function getDb(db) {
  return db && typeof db.query === 'function' ? db : pool;
}

async function getTodosSacramentos(db) {
  const client = getDb(db);
  const result = await client.query(
    `SELECT s.*, ce.nome AS celebrante_nome
       FROM sacramentos s
  LEFT JOIN celebrantes ce ON ce.id = s.celebrante_id
   ORDER BY s.data ASC, s.hora ASC`
  );
  return result.rows;
}

async function getSacramentoPorId(id, db) {
  const client = getDb(db);
  const result = await client.query(
    `SELECT s.*, ce.nome AS celebrante_nome
       FROM sacramentos s
  LEFT JOIN celebrantes ce ON ce.id = s.celebrante_id
      WHERE s.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getSacramentoPorDataHora(data, hora, db) {
  const client = getDb(db);
  // Para verificação de disponibilidade, basta saber se existe algum registo
  // na data/hora. Evitamos JOINs aqui para reduzir falhas por diferenças de
  // esquema e simplificar o acesso.
  const result = await client.query(
    `SELECT *
       FROM sacramentos
      WHERE LEFT(data::text, 10) = LEFT($1::text, 10)
        AND LEFT(hora::text, 5) = LEFT($2::text, 5)
      LIMIT 1`,
    [data, hora]
  );
  return result.rows[0] || null;
}

async function criarSacramento({ data, hora, tipo, local, celebranteId }) {
  if (!data || !hora || !tipo || !celebranteId) {
    const err = new Error('Data, hora, tipo e celebrante sao obrigatorios.');
    err.code = 'CAMPOS_OBRIGATORIOS';
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const conflito = await client.query(
      `SELECT 1 FROM sacramentos
        WHERE LEFT(data::text, 10) = LEFT($1::text, 10)
          AND LEFT(hora::text, 5) = LEFT($2::text, 5)`,
      [data, hora]
    );
    if (conflito.rowCount > 0) {
      const err = new Error('Ja existe um sacramento nesta data/hora.');
      err.code = 'CONFLITO_AGENDA';
      throw err;
    }

    const result = await client.query(
      `INSERT INTO sacramentos (data, hora, tipo, local, celebrante_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data, hora, tipo, local || null, celebranteId]
    );
    const novo = result.rows[0];
    await client.query('COMMIT');
    return novo;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateSacramento(id, { data, hora, tipo, local, celebranteId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const conflito = await client.query(
      `SELECT 1 FROM sacramentos
        WHERE LEFT(data::text, 10) = LEFT($1::text, 10)
          AND LEFT(hora::text, 5) = LEFT($2::text, 5)
          AND id <> $3`,
      [data, hora, id]
    );
    if (conflito.rowCount > 0) {
      const err = new Error('Ja existe outro sacramento nesta data/hora.');
      err.code = 'CONFLITO_AGENDA';
      throw err;
    }

    const result = await client.query(
      `UPDATE sacramentos
          SET data = $1,
              hora = $2,
              tipo = $3,
              local = $4,
              celebrante_id = $5
        WHERE id = $6
      RETURNING *`,
      [data, hora, tipo, local || null, celebranteId, id]
    );

    const atual = result.rows[0] || null;
    await client.query('COMMIT');
    return atual;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteSacramento(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('DELETE FROM sacramentos WHERE id = $1', [id]);
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
  getTodosSacramentos,
  getSacramentoPorId,
  getSacramentoPorDataHora,
  criarSacramento,
  updateSacramento,
  deleteSacramento,
};
