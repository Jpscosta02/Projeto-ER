// backend/models/Celebracao.js
const pool = require('../config/db');

async function getTodasCelebracoes() {
  const result = await pool.query(
    'SELECT * FROM celebracoes ORDER BY data ASC'
  );
  return result.rows;
}

module.exports = { getTodasCelebracoes };
