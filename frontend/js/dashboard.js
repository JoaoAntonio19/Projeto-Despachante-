const API = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token');
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
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
    const [resClientes, resVeiculos, resProcessos] = await Promise.all([
      fetch(`${API}/clientes`, { headers: getHeaders() }),
      fetch(`${API}/veiculos`, { headers: getHeaders() }),
      fetch(`${API}/processos`, { headers: getHeaders() })
    ]);
    
    if (resClientes.status === 401) { 
      verificarAuth({ mensagem: 'Token inválido ou expirado' }); 
      return; 
    }
    
    const clientes = await resClientes.json();
    const veiculos = await resVeiculos.json();
    const processos = await resProcessos.json();
    
    document.getElementById('totalClientes').textContent = clientes.length || 0;
    document.getElementById('totalVeiculos').textContent = veiculos.length || 0;
    document.getElementById('totalAbertos').textContent = 
      processos.filter(p => p.status === 'aberto' || p.status === 'em_andamento').length || 0;
    document.getElementById('totalAlertas').textContent = 
      processos.filter(p => {
        const prazo = new Date(p.data_abertura);
        prazo.setDate(prazo.getDate() + p.prazo);
        const dias = Math.ceil((prazo - new Date()) / (1000 * 60 * 60 * 24));
        return dias > 0 && dias <= 30;
      }).length || 0;
    
    renderizarAlertas(processos, clientes, veiculos);
    renderizarSolicitacoes(processos);
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
  }
}

function renderizarAlertas(processos, clientes, veiculos) {
  const tbody = document.getElementById('tabelaAlertas');
  if (!tbody) return;
  
  const alertas = processos.filter(p => {
    const prazo = new Date(p.data_abertura);
    prazo.setDate(prazo.getDate() + p.prazo);
    const dias = Math.ceil((prazo - new Date()) / (1000 * 60 * 60 * 24));
    return dias > 0 && dias <= 30;
  }).slice(0, 5);
  
  if (alertas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum processo com prazo próximo.</td></tr>';
    return;
  }
  
  tbody.innerHTML = alertas.map(p => {
    const cliente = clientes.find(c => c.id === p.cliente_id);
    const veiculo = veiculos.find(v => v.id === p.veiculo_id);
    
    return `
      <tr>
        <td>${cliente?.nome || '--'}</td>
        <td>${p.tipo || '--'}</td>
        <td><span class="badge-placa">${veiculo?.placa || '--'}</span></td>
        <td>${new Date(p.data_abertura).toLocaleDateString('pt-BR')}</td>
        <td><span class="badge-status ${p.status || 'aberto'}">${p.status || 'Aberto'}</span></td>
      </tr>
    `;
  }).join('');
}

function renderizarSolicitacoes(processos) {
  const lista = document.getElementById('listaSolicitacoes');
  if (!lista) return;
  
  const recentes = processos.slice(0, 3);
  
  if (recentes.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhuma solicitação no portal.</p>';
    return;
  }
  
  lista.innerHTML = recentes.map(p => `
    <div class="solicitacao-card">
      <div class="solicitacao-info">
        <div class="solicitacao-cliente">${p.tipo || 'Solicitação'}</div>
        <div class="solicitacao-data">${new Date(p.data_abertura).toLocaleDateString('pt-BR')} às ${new Date(p.data_abertura).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <span class="solicitacao-status ${p.status || 'pendente'}">${p.status || 'Pendente'}</span>
        <button class="btn-ver-docs" onclick="verDocumentos(${p.id})">Ver Docs</button>
      </div>
    </div>
  `).join('');
}

function gerarLinkPortal() {
  const link = `${window.location.origin}/portal-cliente.html?token=${Math.random().toString(36).substring(7)}`;
  document.getElementById('linkGerado').value = link;
  document.getElementById('modalLink').classList.add('ativo');
}

function fecharModalLink() {
  document.getElementById('modalLink').classList.remove('ativo');
}

function copiarLink() {
  const link = document.getElementById('linkGerado');
  link.select();
  document.execCommand('copy');
  document.getElementById('linkCopiado').style.display = 'block';
  setTimeout(() => {
    document.getElementById('linkCopiado').style.display = 'none';
  }, 2000);
}

function verDocumentos(id) {
  const modal = document.getElementById('modalDocs');
  if (modal) {
    document.getElementById('docsConteudo').innerHTML = '<p>Documentos do processo #' + id + '</p>';
    modal.classList.add('ativo');
  }
}

function fecharModalDocs() {
  document.getElementById('modalDocs')?.classList.remove('ativo');
}

document.addEventListener('DOMContentLoaded', carregarDashboard);