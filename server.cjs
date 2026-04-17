const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const db = require('./database');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'frontend')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Middleware de autenticação JWT ───────────────────────────────────────────
function autenticar(req, res, next) {
  const auth = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!auth) return res.status(401).json({ mensagem: 'Não autorizado' });

  try {
    const payload = jwt.verify(auth, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ mensagem: 'Token inválido' });
  }
}

// ─── Nodemailer ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ─── Rotas de autenticação ────────────────────────────────────────────────────
app.post('/api/auth/cadastro', async (req, res) => {
  const { nome, email, confirmarEmail, telefone, senha } = req.body;
  if (!nome || !email || !confirmarEmail || !telefone || !senha)
    return res.status(400).json({ mensagem: 'Preencha todos os campos' });

  if (email !== confirmarEmail)
    return res.status(400).json({ mensagem: 'Os emails não conferem' });

  if (senha.length < 6)
    return res.status(400).json({ mensagem: 'Senha precisa ter ao menos 6 caracteres' });

  try {
    const { rows } = await db.query('SELECT id FROM despachantes WHERE email = $1', [email]);
    if (rows.length) return res.status(409).json({ mensagem: 'Email já cadastrado' });

    const senha_hash = await bcrypt.hash(senha, 10);
    const token_confirmacao = crypto.randomBytes(32).toString('hex');

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO despachantes (nome, email, telefone, senha_hash, token_confirmacao)
         VALUES ($1, $2, $3, $4, $5)`,
        [nome, email, telefone, senha_hash, token_confirmacao]
      );

      const link = `${process.env.BASE_URL}/verificar-email.html?token=${token_confirmacao}`;
      
      // ─── TEMPLATE DE EMAIL PROFISSIONAL ───
      const htmlEmail = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 40px 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="background-color: #1e3a8a; padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">
                Despachante <span style="color: #facc15;">Guaxupé</span>
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e293b; margin-top: 0;">Olá, ${nome}!</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Seja bem-vindo ao nosso sistema. Para garantir a segurança da sua conta, precisamos que confirme seu endereço de e-mail clicando no botão abaixo.
              </p>
              <div style="text-align: center; margin: 35px 0;">
                <a href="${link}" style="background-color: #1e3a8a; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                  Confirmar meu E-mail
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 14px; text-align: center;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
                <span style="color: #1e3a8a; word-break: break-all;">${link}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9;">
              © 2026 Despachante Guaxupé. Todos os direitos reservados.
            </td>
          </tr>
        </table>
      </div>
      `;

      await transporter.sendMail({
        from: `"Despachante Guaxupé" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Confirme seu email - Despachante Guaxupé',
        html: htmlEmail
      });

      await client.query('COMMIT');
      return res.status(201).json({ mensagem: 'Cadastro efetuado. Verifique seu email para confirmar.' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro no cadastro:', error);
      return res.status(500).json({ mensagem: 'Erro ao enviar email. Tente novamente.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensagem: 'Erro no servidor' });
  }
});

app.get('/api/auth/verificar-email', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).json({ mensagem: 'Token ausente' });

  try {
    const { rows } = await db.query(
      'SELECT id FROM despachantes WHERE token_confirmacao = $1', [token]
    );
    if (!rows.length) return res.status(400).json({ mensagem: 'Token inválido ou já utilizado' });

    await db.query(
      'UPDATE despachantes SET confirmado = true, token_confirmacao = NULL WHERE id = $1',
      [rows[0].id]
    );
    return res.json({ mensagem: 'Email confirmado com sucesso! Você já pode fazer login.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensagem: 'Erro no servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ mensagem: 'Preencha email e senha' });

  try {
    const { rows } = await db.query(
      'SELECT id, nome, email, senha_hash, confirmado FROM despachantes WHERE email = $1',
      [email]
    );
    if (!rows.length) return res.status(401).json({ mensagem: 'Email ou senha incorretos' });

    const user = rows[0];
    if (!user.confirmado)
      return res.status(401).json({ mensagem: 'Confirme seu email antes de logar' });

    const senhaValida = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaValida) return res.status(401).json({ mensagem: 'Email ou senha incorretos' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({ token, despachante: { id: user.id, nome: user.nome, email: user.email } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensagem: 'Erro no servidor' });
  }
});

// ─── Rotas de negócio (protegidas por JWT) ────────────────────────────────────
const rotasClientes  = require('./rotas/clientes');
const rotasVeiculos  = require('./rotas/veiculos');
const rotasProcessos = require('./rotas/processos');
const rotasChecklist = require('./rotas/checklist');
const rotasPdf       = require('./rotas/pdf');
const rotasPortal    = require('./rotas/portal');

app.use('/api/clientes',  autenticar, rotasClientes);
app.use('/api/veiculos',  autenticar, rotasVeiculos);
app.use('/api/processos', autenticar, rotasProcessos);
app.use('/api/checklist', autenticar, rotasChecklist);
app.use('/api/pdf',       autenticar, rotasPdf);
app.use('/api/portal',    rotasPortal); 

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));