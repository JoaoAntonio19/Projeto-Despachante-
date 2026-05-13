const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/hoje', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, c.nome AS cliente_nome, ve.placa AS veiculo_placa
      FROM vistorias v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN veiculos ve ON v.veiculo_id = ve.id
      WHERE v.despachante_id = $1 
      AND v.data_hora::date = CURRENT_DATE
      ORDER BY v.data_hora ASC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', async (req, res) => {
  const { cliente_id, veiculo_id, data_hora, local_vistoria, observacoes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO vistorias (despachante_id, cliente_id, veiculo_id, data_hora, local_vistoria, observacoes) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, cliente_id, veiculo_id, data_hora, local_vistoria, observacoes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;