// backend/models/Paroquiano.js
const pool = require('../config/db');

async function getTodosParoquianos() {
  const result = await pool.query(
    'SELECT * FROM paroquianos ORDER BY id DESC'
  );
  return result.rows;
}

async function getAniversariantesDoMes(mes) {
  const result = await pool.query(
    `
      SELECT nome,
             EXTRACT(DAY FROM data_nascimento) AS dia,
             DATE_PART('year', AGE(data_nascimento)) AS idade
      FROM paroquianos
      WHERE EXTRACT(MONTH FROM data_nascimento) = $1
      ORDER BY dia ASC
    `,
    [mes]
  );
  return result.rows;
}

module.exports = {
  getTodosParoquianos,
  getAniversariantesDoMes,
};
