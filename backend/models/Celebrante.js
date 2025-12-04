// backend/models/Celebrante.js
const pool = require('../config/db');

async function getTodosCelebrantes() {
  const result = await pool.query(
    'SELECT * FROM celebrantes ORDER BY id DESC'
  );
  return result.rows;
}

module.exports = { getTodosCelebrantes };
