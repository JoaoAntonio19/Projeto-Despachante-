const express = require('express');
const router = express.Router();
const pool = require('../database');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // Adicionamos o JWT para ler o token de segurança

// Função inteligente para descobrir qual despachante está logado
function getDespachanteId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return null;
  }
}

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

// Gerar link para o cliente (AGORA SALVA O DONO DO LINK)
router.post('/gerar-link', async (req, res) => {
  const despachanteId = getDespachanteId(req);
  if (!despachanteId) return res.status(401).json({ erro: 'Não autorizado' });

  const { processo_id } = req.body;
  const token = crypto.randomBytes(10).toString('hex');
  try {
    await pool.query(
      'INSERT INTO portal_solicitacoes (token, processo_id, status, despachante_id) VALUES ($1, $2, $3, $4)',
      [token, processo_id || null, 'pendente', despachanteId]
    );
    res.json({ token });
  } catch (err) {
    console.error("Erro ao gerar link:", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// Buscar dados da solicitação pelo token (Sem autenticação, é o cliente que acessa)
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
  { name: 'fotoFrente', maxCount: 1 },
  { name: 'fotoTraseira', maxCount: 1 },
  { name: 'fotoLateral', maxCount: 1 },
  { name: 'fotoPainel', maxCount: 1 },
  { name: 'fotosExtras', maxCount: 10 }
  
]), async (req, res) => {
  const { token } = req.params;
  const { nome, cpf, telefone, email, cep, endereco, cidade, estado, placa, renavam, chassi, marca, modelo, ano_modelo, ano_fabricacao, combustivel, categoria } = req.body;

  try {
    const solResult = await pool.query(
      'SELECT * FROM portal_solicitacoes WHERE token = $1 AND status = $2',
      [token, 'pendente']
    );
    if (solResult.rows.length === 0) {
      return res.status(400).json({ erro: 'Link inválido ou já utilizado' });
    }
    const solicitacao = solResult.rows[0];
    const despachanteDono = solicitacao.despachante_id;

    // 1. Cadastrar/Atualizar Cliente (AGORA SALVA PARA O DESPACHANTE CORRETO)
    let clienteId;
    const clienteExistente = await pool.query('SELECT id FROM clientes WHERE cpf = $1 AND despachante_id = $2', [cpf, despachanteDono]);
    
    if (clienteExistente.rows.length > 0) {
      clienteId = clienteExistente.rows[0].id;
      await pool.query(
        'UPDATE clientes SET nome=$1, telefone=$2, email=$3, endereco=$4, cidade=$5, estado=$6, cep=$7 WHERE id=$8',
        [nome, telefone, email, endereco, cidade, estado, cep, clienteId]
      );
    } else {
      const novoCliente = await pool.query(
        'INSERT INTO clientes (nome, cpf, telefone, email, endereco, cidade, estado, cep, despachante_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
        [nome, cpf, telefone, email, endereco, cidade, estado, cep, despachanteDono]
      );
      clienteId = novoCliente.rows[0].id;
    }

    let veiculoId = null;
    if (placa) {
      const vExistente = await pool.query('SELECT id FROM veiculos WHERE placa = $1', [placa]);
      if (vExistente.rows.length > 0) {
        veiculoId = vExistente.rows[0].id;
      } else {
        const nV = await pool.query(
          'INSERT INTO veiculos (cliente_id, placa, renavam, chassi, marca, modelo, ano_modelo, ano_fabricacao, combustivel, categoria) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
          [clienteId, placa, renavam, chassi, marca, modelo, ano_modelo, ano_fabricacao, combustivel, categoria]
        );
        veiculoId = nV.rows[0].id;
      }
    }

    for (const [tipo, files] of Object.entries(req.files || {})) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await pool.query(
          'INSERT INTO portal_documentos (solicitacao_id, tipo_documento, nome_arquivo, caminho) VALUES ($1,$2,$3,$4)',
          [solicitacao.id, tipo, file.originalname, file.path]
        );
      }
    }

    await pool.query(
      'UPDATE portal_solicitacoes SET status=$1, nome_cliente=$2, cliente_id=$3, veiculo_id=$4 WHERE id=$5',
      ['concluido', nome, clienteId, veiculoId, solicitacao.id]
    );

    res.json({ sucesso: true, mensagem: 'Dados enviados com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

// Listar solicitações para o Dashboard (AGORA ISOLADO POR DESPACHANTE)
router.get('/pendentes', async (req, res) => {
  const despachanteId = getDespachanteId(req);
  if (!despachanteId) return res.status(401).json({ erro: 'Não autorizado' });

  try {
    const result = await pool.query(
      `SELECT ps.*, 
        COALESCE(ps.nome_cliente, c.nome, 'Cliente Novo') as cliente_nome
       FROM portal_solicitacoes ps
       LEFT JOIN processos p ON ps.processo_id = p.id
       LEFT JOIN clientes c ON p.cliente_id = c.id
       WHERE ps.status = 'concluido' 
       AND (ps.despachante_id = $1 OR c.despachante_id = $1)
       ORDER BY ps.criado_em DESC LIMIT 10`,
      [despachanteId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Buscar documentos de uma solicitação específica
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

// Excluir solicitação e seus documentos
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