// backend/models/Utilizador.js
const pool = require('../config/db');


async function obterPorEmail(contactoOuEmail) {
  const query = `
    (
      SELECT id, nome, contacto AS email, password, 'paroquiano' AS role
      FROM paroquianos
      WHERE contacto = $1
    )
    UNION ALL
    (
      SELECT id, nome, email, password, 'admin' AS role
      FROM celebrantes
      WHERE email = $1
    )
    LIMIT 1
  `;

  const result = await pool.query(query, [contactoOuEmail]);
  return result.rows[0] || null;
}

async function criarParoquiano({ nome, email, password, data_nascimento = '1900-01-01' }) {
  const result = await pool.query(
    `INSERT INTO paroquianos (nome, contacto, password, data_nascimento)
       SELECT $1::text, $2::text, $3::text, $4::date
      WHERE NOT EXISTS (SELECT 1 FROM paroquianos WHERE contacto = $2::text)
      RETURNING *`,
    [nome, email, password, data_nascimento]
  );
  return result.rows[0] || null;
}

module.exports = {
  obterPorEmail,
  criarParoquiano,
};
