const express = require('express');
const router = express.Router();
const pool = require('../database');
const PDFDocument = require('pdfkit');

router.get('/procuracao/:processo_id', async (req, res) => {
  try {
    // Buscar dados do processo
    const processoResult = await pool.query(
      `SELECT p.*, c.nome as cliente_nome, c.cpf as cliente_cpf, 
       c.endereco, c.cidade, c.cep,
       v.placa, v.renavam, v.chassi, v.marca, v.modelo
       FROM processos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN veiculos v ON p.veiculo_id = v.id
       WHERE p.id = $1`,
      [req.params.processo_id]
    );

    if (processoResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Processo não encontrado' });
    }

    const dados = processoResult.rows[0];
    const hoje = new Date().toLocaleDateString('pt-BR');

    // Criar PDF
    const doc = new PDFDocument({ margin: 60, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=procuracao_${dados.placa || dados.cliente_cpf}.pdf`);
    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(16).font('Helvetica-Bold')
       .text('PROCURAÇÃO', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica')
       .text('Ad Negotia Et Ad Judicia', { align: 'center' });
    doc.moveDown(1.5);

    // Linha separadora
    doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke();
    doc.moveDown(1);

    // Outorgante
    doc.fontSize(12).font('Helvetica-Bold').text('OUTORGANTE:');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Nome: ${dados.cliente_nome || '___________________________'}`);
    doc.text(`CPF: ${dados.cliente_cpf || '___________________________'}`);
    doc.text(`Endereço: ${dados.endereco || '___________________________'}`);
    doc.text(`Cidade: ${dados.cidade || '___________________________'}`);
    doc.moveDown(1);

    // Outorgado
    doc.fontSize(12).font('Helvetica-Bold').text('OUTORGADO:');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11);
    doc.text('Nome: Lawrence Albert Gonçalves');
    doc.text('Qualificação: Despachante Documentalista');
    doc.text('Cidade: Guaxupé - MG');
    doc.moveDown(1);

    // Veículo
    if (dados.placa) {
      doc.fontSize(12).font('Helvetica-Bold').text('DADOS DO VEÍCULO:');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(11);
      doc.text(`Placa: ${dados.placa || '___________'}`);
      doc.text(`RENAVAM: ${dados.renavam || '___________'}`);
      doc.text(`Chassi: ${dados.chassi || '___________'}`);
      doc.text(`Marca/Modelo: ${dados.marca || '___'} ${dados.modelo || '___'}`);
      doc.moveDown(1);
    }

    // Poderes
    doc.fontSize(12).font('Helvetica-Bold').text('PODERES:');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11);
    doc.text(
      `Pelo presente instrumento particular de procuração,
       o(a) OUTORGANTE acima qualificado(a) nomeia e constitui seu bastante procurador o(a) OUTORGADO(A),
        a quem confere amplos poderes para representá-lo(a) junto ao DETRAN-MG e demais órgãos competentes,
        para fins de: ${dados.tipo || 'serviços de despachante'},
        podendo assinar documentos, requerer certidões,
        pagar taxas e praticar todos os atos necessários ao fiel cumprimento deste mandato.`,
      { align: 'justify' }
    );
    doc.moveDown(1.5);

    // Local e data
    doc.fontSize(11).font('Helvetica')
       .text(`Guaxupé - MG, ${hoje}`, { align: 'right' });
    doc.moveDown(3);

    // Assinatura
    doc.moveTo(150, doc.y).lineTo(450, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica')
       .text(dados.cliente_nome || 'Outorgante', { align: 'center' });
    doc.text('CPF: ' + (dados.cliente_cpf || ''), { align: 'center' });

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;