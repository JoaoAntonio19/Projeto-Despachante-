const express = require('express');
const router = express.Router();
const pool = require('../database');
const jwt = require('jsonwebtoken');

// Função de segurança: descobre qual despachante está logado
function getDespachanteId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return null;
  }
}

// Listar clientes
router.get('/', async (req, res) => {
  const despachanteId = getDespachanteId(req);
  if (!despachanteId) return res.status(401).json({ erro: 'Não autorizado' });

  try {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE despachante_id = $1 ORDER BY nome',
      [despachanteId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Buscar cliente específico
router.get('/:id', async (req, res) => {
  const despachanteId = getDespachanteId(req);
  if (!despachanteId) return res.status(401).json({ erro: 'Não autorizado' });

  try {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE id = $1 AND despachante_id = $2',
      [req.params.id, despachanteId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Criar cliente
router.post('/', async (req, res) => {
  const despachanteId = getDespachanteId(req);
  if (!despachanteId) return res.status(401).json({ erro: 'Não autorizado' });

  // UPDATE: Removed 'rg' and 'cep', added 'estado'
  const { nome, cpf, telefone, email, endereco, cidade, estado } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nome, cpf, telefone, email, endereco, cidade, estado, despachante_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [nome, cpf, telefone, email, endereco, cidade, estado, despachanteId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Atualizar cliente
router.put('/:id', async (req, res) => {
  const despachanteId = getDespachanteId(req);
  if (!despachanteId) return res.status(401).json({ erro: 'Não autorizado' });

  // UPDATE: Removed 'rg' and 'cep', added 'estado'
  const { nome, cpf, telefone, email, endereco, cidade, estado } = req.body;
  try {
    const result = await pool.query(
      'UPDATE clientes SET nome=$1, cpf=$2, telefone=$3, email=$4, endereco=$5, cidade=$6, estado=$7 WHERE id=$8 AND despachante_id=$9 RETURNING *',
      [nome, cpf, telefone, email, endereco, cidade, estado, req.params.id, despachanteId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Deletar cliente
router.delete('/:id', async (req, res) => {
  const despachanteId = getDespachanteId(req);
  if (!despachanteId) return res.status(401).json({ erro: 'Não autorizado' });

  try {
    await pool.query(`
      DELETE FROM checklist_documentos 
      WHERE processo_id IN (
        SELECT id FROM processos WHERE cliente_id = $1 AND despachante_id = $2
      )
    `, [req.params.id, despachanteId]);
    await pool.query('DELETE FROM processos WHERE cliente_id = $1 AND despachante_id = $2', [req.params.id, despachanteId]);
    await pool.query('DELETE FROM veiculos WHERE cliente_id = $1 AND despachante_id = $2', [req.params.id, despachanteId]);
    await pool.query('DELETE FROM clientes WHERE id = $1 AND despachante_id = $2', [req.params.id, despachanteId]);
    res.json({ mensagem: 'Cliente e todos os dados vinculados deletados com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;