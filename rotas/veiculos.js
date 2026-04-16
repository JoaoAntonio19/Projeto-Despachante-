const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM veiculos WHERE despachante_id = $1 ORDER BY id DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/cliente/:cliente_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM veiculos WHERE cliente_id = $1 AND despachante_id = $2',
      [req.params.cliente_id, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', async (req, res) => {
  const { cliente_id, placa, renavam, chassi, categoria, ano_modelo, ano_fabricacao, combustivel, marca, modelo } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO veiculos (cliente_id, placa, renavam, chassi, categoria, ano_modelo, ano_fabricacao, combustivel, marca, modelo, despachante_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [cliente_id, placa, renavam, chassi, categoria, ano_modelo, ano_fabricacao, combustivel, marca, modelo, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { placa, renavam, chassi, categoria, ano_modelo, ano_fabricacao, combustivel, marca, modelo } = req.body;
  try {
    const result = await pool.query(
      'UPDATE veiculos SET placa=$1, renavam=$2, chassi=$3, categoria=$4, ano_modelo=$5, ano_fabricacao=$6, combustivel=$7, marca=$8, modelo=$9 WHERE id=$10 AND despachante_id=$11 RETURNING *',
      [placa, renavam, chassi, categoria, ano_modelo, ano_fabricacao, combustivel, marca, modelo, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM veiculos WHERE id = $1 AND despachante_id = $2', [req.params.id, req.user.id]);
    res.json({ mensagem: 'Veículo deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;