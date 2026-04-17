const API = 'http://localhost:3000/api';
let todosProcessos = [];
let todosClientes = [];
let todosVeiculos = [];

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

async function carregarDados() {
  if (!verificarAuth()) return;
  try {
    const [resProcessos, resClientes, resVeiculos] = await Promise.all([
      fetch(`${API}/processos`, { headers: getHeaders() }),
      fetch(`${API}/clientes`, { headers: getHeaders() }),
      fetch(`${API}/veiculos`, { headers: getHeaders() })
    ]);
    
    if (resProcessos.status === 401 || resClientes.status === 401) { 
      verificarAuth({ mensagem: 'Token inválido ou expirado' }); 
      return; 
    }
    
    todosProcessos = await resProcessos.json();
    todosClientes = await resClientes.json();
    todosVeiculos = await resVeiculos.json();
    
    populateSeletores();
    renderizarTabela(todosProcessos);
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
}

function populateSeletores() {
  const selectCliente = document.getElementById('processoCliente');
  const selectVeiculo = document.getElementById('processoVeiculo');
  
  if (selectCliente) {
    selectCliente.innerHTML = '<option value="">Selecione um cliente</option>' +
      todosClientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  }
  
  if (selectVeiculo) {
    selectVeiculo.innerHTML = '<option value="">Selecione um veículo</option>' +
      todosVeiculos.map(v => `<option value="${v.id}">${v.marca} - ${v.placa}</option>`).join('');
  }
}

function renderizarTabela(processos) {
  const tbody = document.getElementById('tabelaProcessos');
  if (!tbody) return;
  
  if (processos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="vazio">Nenhum processo cadastrado.</td></tr>';
    return;
  }
  
  tbody.innerHTML = processos.map(p => {
    const cliente = todosClientes.find(c => c.id === p.cliente_id);
    const veiculo = todosVeiculos.find(v => v.id === p.veiculo_id);
    const statusClass = p.status || 'aberto';
    
    return `
      <tr>
        <td>${cliente?.nome || '--'}</td>
        <td>${p.tipo || '--'}</td>
        <td><span class="badge-placa">${veiculo?.placa || '--'}</span></td>
        <td>${new Date(p.data_abertura).toLocaleDateString('pt-BR') || '--'}</td>
        <td>${p.prazo || '--'} dias</td>
        <td><span class="badge-status ${statusClass}">${p.status || 'Aberto'}</span></td>
        <td>
          <div class="acoes">
            <button class="btn-icone editar" title="Editar" onclick="editarProcesso(${p.id})">✎</button>
            <button class="btn-icone deletar" title="Excluir" onclick="deletarProcesso(${p.id})">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function editarProcesso(id) {
  const processo = todosProcessos.find(p => p.id === id);
  if (!processo) return;
  
  document.getElementById('modalTitulo').textContent = 'Editar Processo';
  document.getElementById('processoId').value = processo.id;
  document.getElementById('processoCliente').value = processo.cliente_id || '';
  document.getElementById('processoVeiculo').value = processo.veiculo_id || '';
  document.getElementById('processoTipo').value = processo.tipo || 'transferencia';
  document.getElementById('processoDataAbertura').value = processo.data_abertura?.split('T')[0] || '';
  document.getElementById('processoPrazo').value = processo.prazo || '';
  document.getElementById('processoStatus').value = processo.status || 'aberto';
  document.getElementById('processoDescricao').value = processo.descricao || '';
  
  document.getElementById('modalProcesso').classList.add('ativo');
}

async function salvarProcesso() {
  const id = document.getElementById('processoId')?.value;
  const dados = {
    cliente_id:     parseInt(document.getElementById('processoCliente').value),
    veiculo_id:     parseInt(document.getElementById('processoVeiculo').value),
    tipo:           document.getElementById('processoTipo').value,
    data_abertura:  document.getElementById('processoDataAbertura').value,
    prazo:          parseInt(document.getElementById('processoPrazo').value),
    status:         document.getElementById('processoStatus').value,
    descricao:      document.getElementById('processoDescricao').value,
  };
  
  if (!dados.cliente_id || !dados.veiculo_id) { 
    alert('Cliente e Veículo são obrigatórios!'); 
    return; 
  }
  
  try {
    const url = id ? `${API}/processos/${id}` : `${API}/processos`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { 
      method, 
      headers: getHeaders(), 
      body: JSON.stringify(dados) 
    });
    
    if (!res.ok) throw new Error('Erro ao salvar processo');
    
    fecharModalProcesso();
    carregarDados();
  } catch (err) {
    console.error('Erro ao salvar processo:', err);
    alert('Erro ao salvar processo!');
  }
}

async function deletarProcesso(id) {
  if (!confirm('Tem certeza que deseja excluir este processo?')) return;
  
  try {
    const res = await fetch(`${API}/processos/${id}`, { 
      method: 'DELETE', 
      headers: getHeaders() 
    });
    
    if (!res.ok) throw new Error('Erro ao deletar processo');
    
    carregarDados();
  } catch (err) {
    console.error('Erro ao deletar processo:', err);
    alert('Erro ao deletar processo!');
  }
}

document.addEventListener('DOMContentLoaded', carregarDados);