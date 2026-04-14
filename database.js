const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sistema_despachante',
  user: 'postgres',
  password: 'Josegui2108',
});

pool.connect()
  .then(() => console.log('Banco de dados conectado!'))
  .catch(err => console.error('Erro ao conectar no banco:', err.message));

module.exports = pool;