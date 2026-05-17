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

router.delete('/:id', async (req, res) => {
  try {
    // Apaga apenas se a vistoria pertencer ao despachante logado
    const result = await pool.query(
      'DELETE FROM vistorias WHERE id = $1 AND despachante_id = $2 RETURNING *', 
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ erro: 'Vistoria não encontrada.' });
    res.json({ mensagem: 'Vistoria excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE vistorias SET status = $1 WHERE id = $2 AND despachante_id = $3 RETURNING *', 
      [status, req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ erro: 'Vistoria não encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});