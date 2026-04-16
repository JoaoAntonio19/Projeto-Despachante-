const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE despachante_id = $1 ORDER BY nome',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE id = $1 AND despachante_id = $2',
      [req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', async (req, res) => {
  const { nome, cpf, rg, telefone, email, endereco, cidade, cep } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nome, cpf, rg, telefone, email, endereco, cidade, cep, despachante_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [nome, cpf, rg, telefone, email, endereco, cidade, cep, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, cpf, rg, telefone, email, endereco, cidade, cep } = req.body;
  try {
    const result = await pool.query(
      'UPDATE clientes SET nome=$1, cpf=$2, rg=$3, telefone=$4, email=$5, endereco=$6, cidade=$7, cep=$8 WHERE id=$9 AND despachante_id=$10 RETURNING *',
      [nome, cpf, rg, telefone, email, endereco, cidade, cep, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query(`
      DELETE FROM checklist_documentos 
      WHERE processo_id IN (
        SELECT id FROM processos WHERE cliente_id = $1 AND despachante_id = $2
      )
    `, [req.params.id, req.user.id]);
    await pool.query('DELETE FROM processos WHERE cliente_id = $1 AND despachante_id = $2', [req.params.id, req.user.id]);
    await pool.query('DELETE FROM veiculos WHERE cliente_id = $1 AND despachante_id = $2', [req.params.id, req.user.id]);
    await pool.query('DELETE FROM clientes WHERE id = $1 AND despachante_id = $2', [req.params.id, req.user.id]);
    res.json({ mensagem: 'Cliente e todos os dados vinculados deletados com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;