const express = require('express');
const router = express.Router();
const pool = require('../database');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Gerar link para o cliente
router.post('/gerar-link', async (req, res) => {
  const { processo_id } = req.body;
  const token = crypto.randomBytes(20).toString('hex');
  try {
    await pool.query(
      'INSERT INTO portal_solicitacoes (token, processo_id) VALUES ($1, $2)',
      [token, processo_id || null]
    );
    res.json({ token, link: `/portal-cliente.html?token=${token}` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Buscar dados da solicitação pelo token
router.get('/solicitacao/:token', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM portal_solicitacoes WHERE token = $1',
      [req.params.token]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Link inválido ou expirado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Receber dados do cliente pelo portal
router.post('/enviar/:token', upload.fields([
  { name: 'cnh', maxCount: 1 },
  { name: 'comprovante', maxCount: 1 },
  { name: 'crv', maxCount: 1 },
]), async (req, res) => {
  const { token } = req.params;
  const { nome, cpf, telefone, email, cep, endereco, cidade, placa, renavam, chassi, marca, modelo, ano_modelo, ano_fabricacao, combustivel, categoria } = req.body;

  try {
    // Verificar token
    const solResult = await pool.query(
      'SELECT * FROM portal_solicitacoes WHERE token = $1 AND status = $2',
      [token, 'pendente']
    );
    if (solResult.rows.length === 0) {
      return res.status(400).json({ erro: 'Link inválido ou já utilizado' });
    }
    const solicitacao = solResult.rows[0];

    // Verificar se cliente já existe
    let clienteId;
    const clienteExistente = await pool.query('SELECT id FROM clientes WHERE cpf = $1', [cpf]);

    if (clienteExistente.rows.length > 0) {
      clienteId = clienteExistente.rows[0].id;
      await pool.query(
        'UPDATE clientes SET nome=$1, telefone=$2, email=$3, endereco=$4, cidade=$5, cep=$6 WHERE id=$7',
        [nome, telefone, email, endereco, cidade, cep, clienteId]
      );
    } else {
      const novoCliente = await pool.query(
        'INSERT INTO clientes (nome, cpf, telefone, email, endereco, cidade, cep) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [nome, cpf, telefone, email, endereco, cidade, cep]
      );
      clienteId = novoCliente.rows[0].id;
    }

    // Cadastrar veículo se placa foi informada
    let veiculoId = null;
    if (placa) {
      const veiculoExistente = await pool.query('SELECT id FROM veiculos WHERE placa = $1', [placa]);
      if (veiculoExistente.rows.length > 0) {
        veiculoId = veiculoExistente.rows[0].id;
      } else {
        const novoVeiculo = await pool.query(
          'INSERT INTO veiculos (cliente_id, placa, renavam, chassi, marca, modelo, ano_modelo, ano_fabricacao, combustivel, categoria) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
          [clienteId, placa, renavam, chassi, marca, modelo, ano_modelo, ano_fabricacao, combustivel, categoria]
        );
        veiculoId = novoVeiculo.rows[0].id;
      }
    }

    // Salvar documentos enviados
    const arquivos = req.files;
    for (const [tipo, files] of Object.entries(arquivos || {})) {
      const file = files[0];
      await pool.query(
        'INSERT INTO portal_documentos (solicitacao_id, tipo_documento, nome_arquivo, caminho) VALUES ($1,$2,$3,$4)',
        [solicitacao.id, tipo, file.originalname, file.path]
      );
    }

    // Atualizar status da solicitação
    await pool.query(
      'UPDATE portal_solicitacoes SET status=$1 WHERE id=$2',
       ['concluido', nome, solicitacao.id]
    );

    // Atualizar processo se existir
    if (solicitacao.processo_id && veiculoId) {
      await pool.query(
        'UPDATE processos SET cliente_id=$1, veiculo_id=$2 WHERE id=$3',
        [clienteId, veiculoId, solicitacao.processo_id]
      );
    }

    res.json({ sucesso: true, mensagem: 'Dados enviados com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

// Listar solicitações pendentes
router.get('/pendentes', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ps.*, 
        COALESCE(ps.nome_cliente, c.nome) as cliente_nome
       FROM portal_solicitacoes ps
       LEFT JOIN processos p ON ps.processo_id = p.id
       LEFT JOIN clientes c ON p.cliente_id = c.id
       ORDER BY ps.criado_em DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/documentos/:solicitacao_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM portal_documentos WHERE solicitacao_id = $1',
      [req.params.solicitacao_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM portal_documentos WHERE solicitacao_id = $1', [req.params.id]);
    await pool.query('DELETE FROM portal_solicitacoes WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Solicitação deletada com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;