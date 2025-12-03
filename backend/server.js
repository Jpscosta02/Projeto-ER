// backend/server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const pool = require('./db');

// ---------- GET endpoints ----------

// Paroquianos
app.get('/api/paroquianos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM paroquianos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar paroquianos:', err);
    res.status(500).json({ error: 'Erro ao buscar paroquianos' });
  }
});

// Celebrações
app.get('/api/celebracoes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM celebracoes ORDER BY data ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar celebrações:', err);
    res.status(500).json({ error: 'Erro ao buscar celebrações' });
  }
});

// Celebrantes
app.get('/api/celebrantes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM celebrantes ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar celebrantes:', err);
    res.status(500).json({ error: 'Erro ao buscar celebrantes' });
  }
});

// Sacramentos
app.get('/api/sacramentos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sacramentos ORDER BY data DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar sacramentos:', err);
    res.status(500).json({ error: 'Erro ao buscar sacramentos' });
  }
});

// Aniversariantes por mês
app.get('/api/aniversariantes/:mes', async (req, res) => {
  try {
    const mes = parseInt(req.params.mes);
    const result = await pool.query(`
      SELECT nome, EXTRACT(DAY FROM data_nascimento) AS dia,
             DATE_PART('year', AGE(data_nascimento)) AS idade
      FROM paroquianos
      WHERE EXTRACT(MONTH FROM data_nascimento) = $1
      ORDER BY dia ASC
    `, [mes]);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar aniversariantes:', err);
    res.status(500).json({ error: 'Erro ao buscar aniversariantes' });
  }
});

// Estatísticas dinâmicas
app.get('/api/stats', async (req, res) => {
  try {
    const paroquianos = await pool.query('SELECT COUNT(*) FROM paroquianos');
    const celebracoes = await pool.query('SELECT COUNT(*) FROM celebracoes');
    const sacramentos = await pool.query('SELECT COUNT(*) FROM sacramentos');
    const celebrantes = await pool.query('SELECT COUNT(*) FROM celebrantes');

    res.json({
      paroquianos: parseInt(paroquianos.rows[0].count),
      celebracoes: parseInt(celebracoes.rows[0].count),
      sacramentos: parseInt(sacramentos.rows[0].count),
      celebrantes: parseInt(celebrantes.rows[0].count)
    });
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    res.status(500).json({ error: 'Erro ao calcular estatísticas' });
  }
});

// ---------- Servidor ----------
app.listen(3001, () => {
  console.log('Servidor backend a correr em http://localhost:3001');
});
