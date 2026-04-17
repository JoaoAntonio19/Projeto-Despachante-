const express = require('express');
const router = express.Router();
const pool = require('../database');
const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Função para ler a imagem e transformar em Base64 (para embutir no PDF)
function getLogoBase64() {
    try {
        // Tenta achar a logo na pasta public
        const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
        if (fs.existsSync(logoPath)) {
            const bitmap = fs.readFileSync(logoPath);
            return `data:image/png;base64,${bitmap.toString('base64')}`;
        }
        return null;
    } catch (err) {
        return null;
    }
}

router.get('/procuracao/:processoId', async (req, res) => {
  const { processoId } = req.params;
  const token = req.query.token;

  if (!token) return res.status(401).send('Token não fornecido');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const despachanteId = decoded.id;

    // Buscar dados completos
    const procResult = await pool.query(`
      SELECT 
        p.*, 
        c.nome as cliente_nome, c.cpf, c.endereco, c.cidade, c.estado,
        v.placa, v.renavam, v.chassi, v.marca, v.modelo,
        d.nome as despachante_nome
      FROM processos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN veiculos v ON p.veiculo_id = v.id
      JOIN despachantes d ON p.despachante_id = d.id
      WHERE p.id = $1 AND p.despachante_id = $2
    `, [processoId, despachanteId]);

    if (procResult.rows.length === 0) return res.status(404).send('Processo não encontrado');
    const dados = procResult.rows[0];

    // Pegar a logo em Base64
    const logoSrc = getLogoBase64();
    const imgTag = logoSrc ? `<img src="${logoSrc}" class="logo" />` : `<h1 class="logo-texto">DESPACHANTE GUAXUPÉ</h1>`;

    const dataAtual = new Date().toLocaleDateString('pt-BR');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
       <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px 40px; color: #333; line-height: 1.4; }
          .cabecalho { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
          .logo { max-width: 220px; margin-bottom: 5px; }
          .logo-texto { color: #1e3a8a; font-size: 22px; margin: 0; }
          .titulo { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 5px; letter-spacing: 2px; }
          .subtitulo { font-size: 13px; text-align: center; font-style: italic; margin-bottom: 20px; color: #555; }
          
          .bloco { border: 1px solid #ccc; border-radius: 5px; padding: 12px 15px; margin-bottom: 12px; background-color: #f9fafb; }
          .bloco-titulo { font-weight: bold; font-size: 13px; color: #1e3a8a; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; text-transform: uppercase; }
          
          .linha { margin-bottom: 3px; font-size: 13px; }
          .label { font-weight: bold; }
          
          .poderes { text-align: justify; margin-top: 15px; font-size: 13px; }
          .data-local { text-align: right; margin-top: 25px; font-size: 13px; }
          
          .assinatura-area { margin-top: 50px; text-align: center; }
          .linha-assinatura { width: 60%; margin: 0 auto; border-top: 1px solid #000; margin-bottom: 5px; }
          .nome-assinatura { font-weight: bold; font-size: 13px; }
          .cpf-assinatura { font-size: 11px; color: #555; }
        </style>
      </head>
      <body>

        <div class="cabecalho">
          ${imgTag}
        </div>

        <div class="titulo">PROCURAÇÃO</div>
        <div class="subtitulo">Ad Negotia Et Ad Judicia</div>

        <div class="bloco">
          <div class="bloco-titulo">Outorgante (Cliente)</div>
          <div class="linha"><span class="label">Nome:</span> ${dados.cliente_nome}</div>
          <div class="linha"><span class="label">CPF:</span> ${dados.cpf}</div>
          <div class="linha"><span class="label">Endereço:</span> ${dados.endereco || '--'}</div>
          <div class="linha"><span class="label">Cidade/UF:</span> ${dados.cidade || '--'} ${dados.estado ? '- ' + dados.estado : ''}</div>
        </div>

        <div class="bloco">
          <div class="bloco-titulo">Outorgado (Despachante)</div>
          <div class="linha"><span class="label">Nome:</span> ${dados.despachante_nome}</div>
          <div class="linha"><span class="label">Qualificação:</span> Despachante</div>
          <div class="linha"><span class="label">Cidade:</span> Guaxupé - MG</div>
        </div>

        <div class="bloco">
          <div class="bloco-titulo">Dados do Veículo</div>
          <div class="linha"><span class="label">Placa:</span> ${dados.placa}</div>
          <div class="linha"><span class="label">Renavam:</span> ${dados.renavam || '--'}</div>
          <div class="linha"><span class="label">Chassi:</span> ${dados.chassi || '--'}</div>
          <div class="linha"><span class="label">Marca/Modelo:</span> ${dados.marca || ''} ${dados.modelo || ''}</div>
        </div>

        <div class="poderes">
          <div class="bloco-titulo">Poderes Concedidos</div>
          Pelo presente instrumento particular de procuração, o(a) OUTORGANTE acima qualificado(a) nomeia e constitui seu bastante procurador o(a) OUTORGADO(a), a quem confere amplos poderes para representá-lo(a) junto ao <b>DETRAN-MG</b>, CIRETRAN, Secretarias da Fazenda e demais órgãos competentes, especificamente para fins de <b>${dados.tipo}</b>.
          <br><br>
          Para tanto, o outorgado poderá assinar requerimentos, termos de responsabilidade, formulários do RENAVAM, requerer certidões, solicitar segunda via de CRV/CRLV, pagar taxas, apresentar recursos, dar recibos e praticar todos os atos necessários ao fiel cumprimento e andamento deste mandato, dando tudo por bom, firme e valioso.
        </div>

        <div class="data-local">
          Guaxupé - MG, ${dataAtual}
        </div>

        <div class="assinatura-area">
          <div class="linha-assinatura"></div>
          <div class="nome-assinatura">${dados.cliente_nome}</div>
          <div class="cpf-assinatura">CPF: ${dados.cpf}</div>
        </div>

      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao gerar PDF');
  }
});

module.exports = router;