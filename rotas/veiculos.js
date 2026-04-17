const express = require('express');
const router = express.Router();
const pool = require('../database');

// Listar todos os veículos (APENAS DO DESPACHANTE LOGADO)
router.get('/', async (req, res) => {
  try {
    let despachanteId;

    if (req.user && req.user.id) {
      despachanteId = req.user.id;
    } else {
      const jwt = require('jsonwebtoken');
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) return res.status(401).json({ erro: 'Não autorizado' });
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      despachanteId = decoded.id;
    }

    const result = await pool.query(
      `SELECT v.*, c.nome as cliente_nome 
       FROM veiculos v
       LEFT JOIN clientes c ON v.cliente_id = c.id
       WHERE c.despachante_id = $1 OR v.cliente_id IS NULL 
       ORDER BY v.id DESC`,
      [despachanteId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST - Criar novo veículo
router.post('/', async (req, res) => {
  const { cliente_id, placa, renavam, chassi, categoria, ano_modelo, ano_fabricacao, combustivel, marca, modelo } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO veiculos 
      (cliente_id, placa, renavam, chassi, categoria, ano_modelo, ano_fabricacao, combustivel, marca, modelo) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [cliente_id, placa, renavam, chassi, categoria, ano_modelo, ano_fabricacao, combustivel, marca, modelo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT - Atualizar veículo
router.put('/:id', async (req, res) => {
  const { cliente_id, placa, renavam, chassi, categoria, ano_modelo, ano_fabricacao, combustivel, marca, modelo } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE veiculos SET 
      cliente_id=$1, placa=$2, renavam=$3, chassi=$4, categoria=$5, ano_modelo=$6, ano_fabricacao=$7, combustivel=$8, marca=$9, modelo=$10 
      WHERE id=$11 RETURNING *`,
      [cliente_id, placa, renavam, chassi, categoria, ano_modelo, ano_fabricacao, combustivel, marca, modelo, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE - Excluir veículo
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM veiculos WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Veículo deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;