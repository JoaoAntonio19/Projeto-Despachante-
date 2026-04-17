const API = 'http://localhost:3000/api';

function getToken() { return localStorage.getItem('token'); }

function getHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}

function verificarAuth(dados) {
  if (!getToken() || (dados && dados.mensagem === 'Token inválido ou expirado')) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

async function carregarDashboard() {
  if (!verificarAuth()) return;
  try {
    const [resClientes, resVeiculos, resProcessos, resPortal] = await Promise.all([
      fetch(`${API}/clientes`, { headers: getHeaders() }),
      fetch(`${API}/veiculos`, { headers: getHeaders() }),
      fetch(`${API}/processos`, { headers: getHeaders() }),
      fetch(`${API}/portal/pendentes`, { headers: getHeaders() })
    ]);

    if (resClientes.status === 401) {
      verificarAuth({ mensagem: 'Token inválido ou expirado' });
      return;
    }

    const clientes = await resClientes.json();
    const veiculos = await resVeiculos.json();
    const processos = await resProcessos.json();
    const solicitacoesPortal = await resPortal.json();

    document.getElementById('totalClientes').textContent = clientes.length || 0;
    document.getElementById('totalVeiculos').textContent = veiculos.length || 0;
    document.getElementById('totalAbertos').textContent = processos.filter(p => p.status === 'aberto' || p.status === 'em_andamento').length || 0;

    const alertasCount = processos.filter(p => {
      if (p.status === 'concluido' || !p.data_vencimento) return false;
      const venc = new Date(p.data_vencimento.split('T')[0] + 'T00:00:00');
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      return Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24)) <= 30;
    }).length;
    document.getElementById('totalAlertas').textContent = alertasCount;

    // Agora NENHUMA função está faltando!
    renderizarAlertas(processos, clientes, veiculos);
    renderizarSolicitacoes(solicitacoesPortal); 
    
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
  }
}

async function gerarLinkPortal() {
  try {
    const res = await fetch(`${API}/portal/gerar-link`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ processo_id: null })
    });

    if (!res.ok) throw new Error('Erro ao gerar link no servidor');

    const dados = await res.json();
    const linkCompleto = `${window.location.origin}/portal-cliente.html?token=${dados.token}`;

    document.getElementById('linkGerado').value = linkCompleto;
    document.getElementById('modalLink').classList.add('ativo');
  } catch (err) {
    console.error(err);
    alert('Erro ao gerar link no servidor');
  }
}

function renderizarAlertas(processos, clientes, veiculos) {
  const tbody = document.getElementById('tabelaAlertas');
  if (!tbody) return;

  const alertas = processos.filter(p => {
    if (p.status === 'concluido' || !p.data_vencimento) return false;
    const vencimento = new Date(p.data_vencimento.split('T')[0] + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    return diasRestantes <= 30;
  }).sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)).slice(0, 5);

  if (alertas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum processo com prazo próximo.</td></tr>';
    return;
  }

  tbody.innerHTML = alertas.map(p => {
    const cliente = clientes.find(c => c.id === p.cliente_id);
    const veiculo = veiculos.find(v => v.id === p.veiculo_id);
    const vencFmt = new Date(p.data_vencimento.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR');

    return `
      <tr>
        <td>${cliente?.nome || '--'}</td>
        <td>${p.tipo || '--'}</td>
        <td><span class="badge-placa">${veiculo?.placa || '--'}</span></td>
        <td style="color: #dc2626; font-weight: bold;">${vencFmt}</td>
        <td><span class="badge-status ${p.status || 'aberto'}">${p.status.replace('_', ' ').toUpperCase()}</span></td>
      </tr>
    `;
  }).join('');
}

function renderizarSolicitacoes(solicitacoes) {
  const lista = document.getElementById('listaSolicitacoes');
  if (!lista) return;

  if (!solicitacoes || solicitacoes.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhuma solicitação recente no portal.</p>';
    return;
  }

  lista.innerHTML = solicitacoes.map(s => `
    <div class="solicitacao-card">
      <div class="solicitacao-info">
        <div class="solicitacao-cliente">${s.cliente_nome || 'Novo Cliente'}</div>
        <div class="solicitacao-data">Enviado em: ${new Date(s.criado_em).toLocaleDateString('pt-BR')}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="btn-ver-docs" onclick="verDocumentos(${s.id})">Documentos</button>
        
        <button class="btn-excluir-solicitacao" onclick="deletarSolicitacao(${s.id})" title="Apagar Solicitação">✕</button>
      </div>
    </div>
  `).join('');
}

// NOVO: Função para enviar o comando de apagar para o servidor
async function deletarSolicitacao(id) {
  if (!confirm('Tem certeza que deseja apagar esta solicitação? Os documentos anexados também serão excluídos do sistema.')) return;

  try {
    const res = await fetch(`${API}/portal/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!res.ok) throw new Error('Erro ao deletar solicitação');

    // Recarrega o Dashboard para a solicitação sumir da tela na hora
    carregarDashboard();
  } catch (err) {
    console.error('Erro ao excluir:', err);
    alert('Erro ao excluir solicitação.');
  }
}

function copiarLink() {
  const input = document.getElementById('linkGerado');
  input.select();
  document.execCommand('copy');
  document.getElementById('linkCopiado').style.display = 'block';
  setTimeout(() => { document.getElementById('linkCopiado').style.display = 'none'; }, 2000);
}

function fecharModalLink() { document.getElementById('modalLink').classList.remove('ativo'); }

async function verDocumentos(id) {
  const modal = document.getElementById('modalDocs');
  const conteudo = document.getElementById('docsConteudo');
  
  if (modal) {
    conteudo.innerHTML = '<p style="text-align:center; padding: 20px;">Buscando documentos no servidor...</p>';
    modal.classList.add('ativo');

    try {
      const res = await fetch(`${API}/portal/documentos/${id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Erro ao buscar documentos');
      
      const docs = await res.json();

      if (docs.length === 0) {
        conteudo.innerHTML = '<p class="vazio" style="text-align:center;">Nenhum documento foi anexado nesta solicitação.</p>';
        return;
      }

      conteudo.innerHTML = docs.map(d => {
        // --- A MÁGICA ACONTECE AQUI ---
        // Transforma todas as barras \ em / para padronizar
        const caminhoPadronizado = d.caminho.replace(/\\/g, '/');
        
        // Pega APENAS o nome do arquivo que está no final do caminho (ex: 1776396953354-cnh.png)
        const nomeDoArquivo = caminhoPadronizado.split('/').pop();
        
        // Monta o link web correto apontando para a pasta uploads do servidor
        const linkArquivo = `${window.location.origin}/uploads/${nomeDoArquivo}`;
        // ------------------------------
        
        return `
          <div style="margin-bottom: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
            <div>
              <strong style="display: block; color: #1e293b; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">${d.tipo_documento}</strong>
              <span style="font-size: 14px; color: #64748b;">${d.nome_arquivo}</span>
            </div>
            <a href="${linkArquivo}" target="_blank" class="btn-primary" style="text-decoration: none; padding: 6px 16px; font-size: 13px;">Visualizar</a>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error(err);
      conteudo.innerHTML = '<p style="color: red; text-align:center;">Erro ao carregar os documentos. Verifique a conexão.</p>';
    }
  }
}

function fecharModalDocs() { document.getElementById('modalDocs')?.classList.remove('ativo'); }

document.addEventListener('DOMContentLoaded', carregarDashboard);