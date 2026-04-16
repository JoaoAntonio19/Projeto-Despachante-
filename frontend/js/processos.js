const API = 'http://localhost:3000/api';
let todosProcessos = [];
let todosClientes = [];
let todosVeiculos = [];

function getToken() { return localStorage.getItem('token'); }
function getHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}
function verificarAuth() {
  if (!getToken()) { window.location.href = '/login.html'; return false; }
  return true;
}

async function carregarProcessos() {
  if (!verificarAuth()) return;
  try {
    const [resProcessos, resClientes, resVeiculos] = await Promise.all([
      fetch(`${API}/processos`, { headers: getHeaders() }),
      fetch(`${API}/clientes`, { headers: getHeaders() }),
      fetch(`${API}/veiculos`, { headers: getHeaders() }),
    ]);
    if (resProcessos.status === 401 || resProcessos.status === 403) { window.location.href = '/login.html'; return; }

    todosProcessos = await resProcessos.json();
    todosClientes  = await resClientes.json();
    todosVeiculos  = await resVeiculos.json();

    if (!Array.isArray(todosProcessos)) todosProcessos = [];
    if (!Array.isArray(todosClientes))  todosClientes  = [];
    if (!Array.isArray(todosVeiculos))  todosVeiculos  = [];

    preencherSelectClientes(todosClientes);
    renderizarTabela(todosProcessos);
  } catch (err) {
    console.error('Erro ao carregar processos:', err);
  }
}

function preencherSelectClientes(clientes) {
  const select = document.getElementById('cliente_id');
  select.innerHTML = '<option value="">Selecione o cliente</option>';
  clientes.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
  });
}

function carregarVeiculosDoCliente() {
  const clienteId = parseInt(document.getElementById('cliente_id').value);
  const select = document.getElementById('veiculo_id');
  const veiculosDoCliente = todosVeiculos.filter(v => v.cliente_id === clienteId);
  select.innerHTML = '<option value="">Selecione o veículo</option>';
  veiculosDoCliente.forEach(v => {
    select.innerHTML += `<option value="${v.id}">${v.placa} - ${v.marca || ''} ${v.modelo || ''}</option>`;
  });
}

function renderizarTabela(processos) {
  const tbody = document.getElementById('tabelaProcessos');
  if (processos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="vazio">Nenhum processo cadastrado.</td></tr>';
    return;
  }
  const hoje = new Date();
  tbody.innerHTML = processos.map(p => {
    const cliente = todosClientes.find(c => c.id === p.cliente_id);
    const veiculo = todosVeiculos.find(v => v.id === p.veiculo_id);
    let classVencimento = '';
    let dataVencimento = '--';
    if (p.data_vencimento) {
      const venc = new Date(p.data_vencimento);
      const diff = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
      dataVencimento = venc.toLocaleDateString('pt-BR');
      if (diff <= 7) classVencimento = 'urgente';
      else if (diff <= 30) classVencimento = 'proxima';
    }
    return `
      <tr>
        <td>
          <div class="processo-info">
            <span class="processo-nome">${cliente?.nome || '--'}</span>
            <span class="processo-cpf">${cliente?.cpf || ''}</span>
          </div>
        </td>
        <td>${veiculo ? veiculo.placa : '--'}</td>
        <td>${p.tipo}</td>
        <td>${new Date(p.data_abertura).toLocaleDateString('pt-BR')}</td>
        <td><span class="data-vencimento ${classVencimento}">${dataVencimento}</span></td>
        <td><span class="badge-status ${p.status}">${p.status.replace('_', ' ')}</span></td>
        <td>
          <div class="acoes">
            ${p.status !== 'concluido' ? `<button class="btn-icone concluir" title="Concluir" onclick="concluirProcesso(${p.id})">&#10003;</button>` : ''}
            <button class="btn-icone checklist" title="Ver Checklist" onclick="abrirChecklist(${p.id}, '${p.tipo}')">&#9776;</button>
            <button class="btn-icone pdf" title="Gerar Procuração PDF" onclick="gerarPDF(${p.id})">PDF</button>
            <button class="btn-icone editar" title="Editar" onclick="editarProcesso(${p.id})">&#9998;</button>
            <button class="btn-icone deletar" title="Excluir" onclick="deletarProcesso(${p.id})">&#10005;</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function buscarProcessos() {
  const termo = document.getElementById('campoBusca').value.toLowerCase();
  const filtrados = todosProcessos.filter(p => {
    const cliente = todosClientes.find(c => c.id === p.cliente_id);
    return (cliente?.nome || '').toLowerCase().includes(termo) || p.tipo.toLowerCase().includes(termo);
  });
  renderizarTabela(filtrados);
}

function abrirModal() {
  document.getElementById('modalTitulo').textContent = 'Novo Processo';
  document.getElementById('processoId').value = '';
  document.getElementById('cliente_id').value = '';
  document.getElementById('veiculo_id').innerHTML = '<option value="">Selecione o veículo</option>';
  document.getElementById('tipo').value = '';
  document.getElementById('data_abertura').value = new Date().toISOString().split('T')[0];
  document.getElementById('data_vencimento').value = '';
  document.getElementById('status').value = 'aberto';
  document.getElementById('observacoes').value = '';
  document.getElementById('modalOverlay').classList.add('ativo');
}

function fecharModal() {
  document.getElementById('modalOverlay').classList.remove('ativo');
}

async function editarProcesso(id) {
  const p = todosProcessos.find(p => p.id === id);
  if (!p) return;
  document.getElementById('modalTitulo').textContent = 'Editar Processo';
  document.getElementById('processoId').value = p.id;
  document.getElementById('cliente_id').value = p.cliente_id;
  carregarVeiculosDoCliente();
  document.getElementById('veiculo_id').value = p.veiculo_id || '';
  document.getElementById('tipo').value = p.tipo;
  document.getElementById('data_abertura').value = p.data_abertura?.split('T')[0] || '';
  document.getElementById('data_vencimento').value = p.data_vencimento?.split('T')[0] || '';
  document.getElementById('status').value = p.status;
  document.getElementById('observacoes').value = p.observacoes || '';
  document.getElementById('modalOverlay').classList.add('ativo');
}

async function salvarProcesso() {
  const id = document.getElementById('processoId').value;
  const dados = {
    cliente_id:      document.getElementById('cliente_id').value,
    veiculo_id:      document.getElementById('veiculo_id').value || null,
    tipo:            document.getElementById('tipo').value,
    data_abertura:   document.getElementById('data_abertura').value,
    data_vencimento: document.getElementById('data_vencimento').value || null,
    status:          document.getElementById('status').value,
    observacoes:     document.getElementById('observacoes').value,
  };
  if (!dados.cliente_id || !dados.tipo || !dados.data_abertura) {
    alert('Cliente, tipo e data de abertura são obrigatórios!');
    return;
  }
  try {
    const url = id ? `${API}/processos/${id}` : `${API}/processos`;
    const method = id ? 'PUT' : 'POST';
    await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(dados) });
    fecharModal();
    carregarProcessos();
  } catch (err) {
    console.error('Erro ao salvar processo:', err);
  }
}

async function deletarProcesso(id) {
  if (!confirm('Tem certeza que deseja excluir este processo?')) return;
  try {
    await fetch(`${API}/processos/${id}`, { method: 'DELETE', headers: getHeaders() });
    carregarProcessos();
  } catch (err) {
    console.error('Erro ao deletar processo:', err);
  }
}

async function concluirProcesso(id) {
  if (!confirm('Marcar este processo como concluído?')) return;
  try {
    const p = todosProcessos.find(p => p.id === id);
    await fetch(`${API}/processos/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ ...p, status: 'concluido' }),
    });
    carregarProcessos();
  } catch (err) {
    console.error('Erro ao concluir processo:', err);
  }
}

async function abrirChecklist(processoId, tipo) {
  document.getElementById('checklistTitulo').textContent = 'Checklist — ' + tipo;
  document.getElementById('checklistSubtitulo').textContent = 'Marque os documentos já entregues pelo cliente.';
  document.getElementById('checklistItens').innerHTML = 'Carregando...';
  document.getElementById('modalChecklist').classList.add('ativo');
  try {
    let itens = await fetch(`${API}/checklist/${processoId}`, { headers: getHeaders() }).then(r => r.json());
    if (!Array.isArray(itens) || itens.length === 0) {
      itens = await fetch(`${API}/checklist/gerar/${processoId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ tipo }),
      }).then(r => r.json());
    }
    renderizarChecklist(Array.isArray(itens) ? itens : []);
  } catch (err) {
    console.error('Erro ao carregar checklist:', err);
  }
}

function renderizarChecklist(itens) {
  const entregues = itens.filter(i => i.entregue).length;
  document.getElementById('checklistItens').innerHTML = `
    <div class="checklist-progresso">Documentos entregues: ${entregues} de ${itens.length}</div>
    ${itens.map(item => `
      <div class="checklist-item ${item.entregue ? 'entregue' : ''}" id="item-${item.id}">
        <input type="checkbox" id="check-${item.id}" ${item.entregue ? 'checked' : ''}
          onchange="toggleDocumento(${item.id}, this.checked)" />
        <label for="check-${item.id}">${item.documento}</label>
      </div>
    `).join('')}
  `;
}

async function toggleDocumento(id, entregue) {
  try {
    await fetch(`${API}/checklist/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ entregue }),
    });
    const item = document.getElementById(`item-${id}`);
    if (entregue) item.classList.add('entregue');
    else item.classList.remove('entregue');
    const todos = document.querySelectorAll('[id^="check-"]');
    const marcados = document.querySelectorAll('[id^="check-"]:checked');
    document.querySelector('.checklist-progresso').textContent =
      `Documentos entregues: ${marcados.length} de ${todos.length}`;
  } catch (err) {
    console.error('Erro ao atualizar documento:', err);
  }
}

function fecharChecklist() {
  document.getElementById('modalChecklist').classList.remove('ativo');
  carregarProcessos();
}

function gerarPDF(processoId) {
  window.open(`${API}/pdf/procuracao/${processoId}`, '_blank');
}

async function gerarLink(processoId) {
  try {
    const res = await fetch(`${API}/portal/gerar-link`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ processo_id: processoId }),
    });
    const dados = await res.json();
    const linkCompleto = `http://localhost:3000${dados.link}`;
    navigator.clipboard.writeText(linkCompleto).then(() => {
      alert(`Link gerado e copiado!\n\n${linkCompleto}\n\nCole no WhatsApp para o cliente.`);
    }).catch(() => {
      prompt('Copie o link abaixo:', linkCompleto);
    });
  } catch (err) {
    console.error('Erro ao gerar link:', err);
  }
}

carregarProcessos();