// backend/server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const pool = require('./db');

// ---------- GET endpoints ----------
app.get('/api/membros', async (req, res) => {
  const result = await pool.query('SELECT * FROM cadastros');
  res.json(result.rows);
});

app.get('/api/stats', async (req, res) => {
  const result = await pool.query('SELECT * FROM stats');
  res.json(result.rows[0]);
});

app.get('/api/eventos', async (req, res) => {
  const result = await pool.query('SELECT * FROM eventos');
  res.json(result.rows);
});

app.get('/api/aniversariantes', async (req, res) => {
  const result = await pool.query('SELECT * FROM aniversariantes');
  res.json(result.rows);
});

// ---------- POST endpoints ----------

// Adicionar novo membro
app.post('/api/membros', async (req, res) => {
  const { nome, contato } = req.body;
  const result = await pool.query(
    'INSERT INTO cadastros (nome, contato) VALUES ($1, $2) RETURNING *',
    [nome, contato]
  );
  res.json(result.rows[0]);
});

// Adicionar novo aniversariante
app.post('/api/aniversariantes', async (req, res) => {
  const { dia, nome, idade } = req.body;
  const result = await pool.query(
    'INSERT INTO aniversariantes (dia, nome, idade) VALUES ($1, $2, $3) RETURNING *',
    [dia, nome, idade]
  );
  res.json(result.rows[0]);
});

// Adicionar novo evento
app.post('/api/eventos', async (req, res) => {
  const { titulo, data_evento, hora_evento, tipo_nome } = req.body;
  const result = await pool.query(
    'INSERT INTO eventos (titulo, data_evento, hora_evento, tipo_nome) VALUES ($1, $2, $3, $4) RETURNING *',
    [titulo, data_evento, hora_evento, tipo_nome]
  );
  res.json(result.rows[0]);
});

// Atualizar estatísticas (exemplo simples)
app.post('/api/stats', async (req, res) => {
  const { membros, congregados, nao_batizados, batizados } = req.body;
  const result = await pool.query(
    'UPDATE stats SET membros=$1, congregados=$2, nao_batizados=$3, batizados=$4 RETURNING *',
    [membros, congregados, nao_batizados, batizados]
  );
  res.json(result.rows[0]);
});

app.listen(3001, () => {
  console.log('Servidor backend a correr em http://localhost:3001');
});
