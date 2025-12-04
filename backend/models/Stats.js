// backend/models/Stats.js
const pool = require('../config/db');

async function getStats() {
  const paroquianos = await pool.query('SELECT COUNT(*) FROM paroquianos');
  const celebracoes = await pool.query('SELECT COUNT(*) FROM celebracoes');
  const sacramentos = await pool.query('SELECT COUNT(*) FROM sacramentos');
  const celebrantes = await pool.query('SELECT COUNT(*) FROM celebrantes');

  return {
    paroquianos: parseInt(paroquianos.rows[0].count),
    celebracoes: parseInt(celebracoes.rows[0].count),
    sacramentos: parseInt(sacramentos.rows[0].count),
    celebrantes: parseInt(celebrantes.rows[0].count),
  };
}

module.exports = { getStats };
