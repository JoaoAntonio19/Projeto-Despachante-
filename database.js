const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sistema_despachante',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

pool.connect()
  .then(() => console.log('Banco de dados conectado!'))
  .catch(err => console.error('Erro ao conectar no banco:', err.message));

module.exports = pool;