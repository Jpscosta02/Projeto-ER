// backend/models/Sacramento.js
const pool = require('../config/db');

async function getTodosSacramentos() {
  const result = await pool.query(
    'SELECT * FROM sacramentos ORDER BY data DESC'
  );
  return result.rows;
}

module.exports = { getTodosSacramentos };
