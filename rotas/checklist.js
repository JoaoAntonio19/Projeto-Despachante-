const express = require('express');
const router = express.Router();
const pool = require('../database');

// Documentos por tipo de processo
const documentosPorTipo = {
  'Transferência de Veículo': [
    'CRV/DUT original assinado pelo vendedor',
    'CPF do comprador',
    'Comprovante de endereço do comprador',
    'Laudo de vistoria',
    'Procuração (se necessário)',
    'Comprovante de pagamento do DETRAN',
  ],
  'Licenciamento': [
    'CRLV do ano anterior',
    'Comprovante de pagamento do IPVA',
    'Comprovante de pagamento do seguro DPVAT',
    'Laudo de vistoria (se necessário)',
  ],
  'Emplacamento': [
    'Nota fiscal do veículo',
    'CPF do proprietário',
    'Comprovante de endereço',
    'Laudo de vistoria',
    'Comprovante de pagamento das taxas',
  ],
  'Baixa de Veículo': [
    'CRV/DUT original',
    'CPF do proprietário',
    'Comprovante de endereço',
    'Procuração (se necessário)',
  ],
  'Comunicado de Venda': [
    'CRV/DUT original assinado',
    'CPF do vendedor',
    'Dados do comprador (nome e CPF)',
  ],
  'Alteração de Dados': [
    'CRV/DUT original',
    'CPF do proprietário',
    'Comprovante de endereço atualizado',
    'Documento comprobatório da alteração',
  ],
  '2ª Via de Documento': [
    'CPF do proprietário',
    'Comprovante de endereço',
    'Boletim de ocorrência (se perda/roubo)',
    'Comprovante de pagamento da taxa',
  ],
  'Outros': [
    'CPF do proprietário',
    'Comprovante de endereço',
    'Documentação específica do serviço',
  ],
};

// Buscar checklist de um processo
router.get('/:processo_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM checklist_documentos WHERE processo_id = $1 ORDER BY id',
      [req.params.processo_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Criar checklist automático para um processo
router.post('/gerar/:processo_id', async (req, res) => {
  const { tipo } = req.body;
  const processo_id = req.params.processo_id;
  const documentos = documentosPorTipo[tipo] || documentosPorTipo['Outros'];

  try {
    await pool.query('DELETE FROM checklist_documentos WHERE processo_id = $1', [processo_id]);
    for (const doc of documentos) {
      await pool.query(
        'INSERT INTO checklist_documentos (processo_id, documento) VALUES ($1, $2)',
        [processo_id, doc]
      );
    }
    const result = await pool.query(
      'SELECT * FROM checklist_documentos WHERE processo_id = $1 ORDER BY id',
      [processo_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Marcar/desmarcar documento como entregue
router.put('/:id', async (req, res) => {
  const { entregue } = req.body;
  try {
    const result = await pool.query(
      'UPDATE checklist_documentos SET entregue = $1 WHERE id = $2 RETURNING *',
      [entregue, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;