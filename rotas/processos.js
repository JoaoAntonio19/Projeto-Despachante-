const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nome AS cliente_nome, v.placa AS veiculo_placa
      FROM processos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN veiculos v ON p.veiculo_id = v.id
      WHERE p.despachante_id = $1
      ORDER BY p.data_abertura DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/alertas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nome AS cliente_nome, v.placa AS veiculo_placa
      FROM processos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN veiculos v ON p.veiculo_id = v.id
      WHERE p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND p.status != 'concluido'
      AND p.despachante_id = $1
      ORDER BY p.data_vencimento ASC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', async (req, res) => {
  const { cliente_id, veiculo_id, tipo, status, data_abertura, data_vencimento, observacoes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO processos (cliente_id, veiculo_id, tipo, status, data_abertura, data_vencimento, observacoes, despachante_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [cliente_id, veiculo_id, tipo, status, data_abertura, data_vencimento, observacoes, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { tipo, status, data_vencimento, observacoes } = req.body;
  try {
    const result = await pool.query(
      'UPDATE processos SET tipo=$1, status=$2, data_vencimento=$3, observacoes=$4 WHERE id=$5 AND despachante_id=$6 RETURNING *',
      [tipo, status, data_vencimento, observacoes, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM processos WHERE id = $1 AND despachante_id = $2', [req.params.id, req.user.id]);
    res.json({ mensagem: 'Processo deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;