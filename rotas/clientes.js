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

router.put('/:id', async (req, res) => {
  const despachanteId = getDespachanteId(req);
  if (!despachanteId) return res.status(401).json({ erro: 'Não autorizado' });

  const { nome, cpf, telefone, email, cep, endereco, cidade, estado } = req.body;
  try {
    const result = await pool.query(
      'UPDATE clientes SET nome=$1, cpf=$2, telefone=$3, email=$4, cep=$5, endereco=$6, cidade=$7, estado=$8 WHERE id=$9 AND despachante_id=$10 RETURNING *',
      [nome, cpf, telefone, email, cep, endereco, cidade, estado, req.params.id, despachanteId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', async (req, res) => {
  const despachanteId = getDespachanteId(req);
  if (!despachanteId) return res.status(401).json({ erro: 'Não autorizado' });

  const { nome, cpf, telefone, email, cep, endereco, cidade, estado } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nome, cpf, telefone, email, cep, endereco, cidade, estado, despachante_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [nome, cpf, telefone, email, cep, endereco, cidade, estado, despachanteId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const despachanteId = getDespachanteId(req);
  if (!despachanteId) return res.status(401).json({ erro: 'Não autorizado' });

  const clienteId = req.params.id;

  try {
    await pool.query('UPDATE portal_solicitacoes SET cliente_id = NULL WHERE cliente_id = $1', [clienteId]);

    await pool.query('DELETE FROM veiculos WHERE cliente_id = $1', [clienteId]);

    await pool.query('DELETE FROM processos WHERE cliente_id = $1', [clienteId]);

    const result = await pool.query(
      'DELETE FROM clientes WHERE id = $1 AND despachante_id = $2 RETURNING *',
      [clienteId, despachanteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Cliente não encontrado ou já deletado.' });
    }

    res.json({ mensagem: 'Cliente e todos os seus vínculos foram deletados com sucesso!' });
  } catch (err) {
    console.error("Erro ao deletar cliente:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id/documentos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pd.* FROM portal_documentos pd
      JOIN portal_solicitacoes ps ON pd.solicitacao_id = ps.id
      WHERE ps.cliente_id = $1 
      AND pd.tipo_documento IN ('cnh', 'comprovante', 'comprovanteEndereco')
    `, [req.params.id]);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;