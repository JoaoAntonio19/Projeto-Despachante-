const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false 
  }
});

pool.connect()
  .then(() => console.log('Base de dados conectada na Nuvem (Neon)! 🎉'))
  .catch(err => console.error('Erro ao conectar na base de dados:', err.message));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};