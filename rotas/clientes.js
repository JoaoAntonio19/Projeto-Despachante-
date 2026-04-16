const express = require('express');
const router = express.Router();
const pool = require('../database');

// Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Buscar cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Cadastrar novo cliente
router.post('/', async (req, res) => {
  const { nome, cpf, rg, telefone, email, endereco, cidade, cep } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nome, cpf, rg, telefone, email, endereco, cidade, cep) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [nome, cpf, rg, telefone, email, endereco, cidade, cep]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Editar cliente
router.put('/:id', async (req, res) => {
  const { nome, cpf, rg, telefone, email, endereco, cidade, cep } = req.body;
  try {
    const result = await pool.query(
      'UPDATE clientes SET nome=$1, cpf=$2, rg=$3, telefone=$4, email=$5, endereco=$6, cidade=$7, cep=$8 WHERE id=$9 RETURNING *',
      [nome, cpf, rg, telefone, email, endereco, cidade, cep, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Deletar cliente
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(`
      DELETE FROM checklist_documentos 
      WHERE processo_id IN (SELECT id FROM processos WHERE cliente_id = $1)
    `, [req.params.id]);

    await pool.query('DELETE FROM processos WHERE cliente_id = $1', [req.params.id]);

    await pool.query('DELETE FROM veiculos WHERE cliente_id = $1', [req.params.id]);

    await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);

    res.json({ mensagem: 'Cliente e todos os dados vinculados deletados com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;