require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(process.cwd(), 'frontend')));

const clientes = require('./rotas/clientes');
const veiculos = require('./rotas/veiculos');
const processos = require('./rotas/processos');
const checklist = require('./rotas/checklist');
const pdf = require('./rotas/pdf');
const portal = require('./rotas/portal');
const fs = require('fs');


app.use('/api/clientes', clientes);
app.use('/api/veiculos', veiculos);
app.use('/api/processos', processos);
app.use('/api/checklist', checklist);
app.use('/api/pdf', pdf);
app.use('/api/portal', portal);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});