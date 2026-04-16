const API = 'http://localhost:3000/api';
let todosVeiculos = [];

function getToken() { return localStorage.getItem('token'); }
function getHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}
function verificarAuth() {
  if (!getToken()) { window.location.href = '/login.html'; return false; }
  return true;
}

async function carregarVeiculos() {
  if (!verificarAuth()) return;
  try {
    const [resVeiculos, resClientes] = await Promise.all([
      fetch(`${API}/veiculos`, { headers: getHeaders() }),
      fetch(`${API}/clientes`, { headers: getHeaders() }),
    ]);
    if (resVeiculos.status === 401 || resVeiculos.status === 403) { window.location.href = '/login.html'; return; }
    const veiculos = await resVeiculos.json();
    const clientes = await resClientes.json();

    todosVeiculos = (Array.isArray(veiculos) ? veiculos : []).map(v => ({
      ...v,
      proprietario: (Array.isArray(clientes) ? clientes : []).find(c => c.id === v.cliente_id)?.nome || '--'
    }));

    preencherSelectClientes(Array.isArray(clientes) ? clientes : []);
    renderizarTabela(todosVeiculos);
  } catch (err) {
    console.error('Erro ao carregar veículos:', err);
  }
}

function preencherSelectClientes(clientes) {
  const select = document.getElementById('cliente_id');
  select.innerHTML = '<option value="">Selecione o proprietário</option>';
  clientes.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
  });
}

function renderizarTabela(veiculos) {
  const tbody = document.getElementById('tabelaVeiculos');
  if (!veiculos || veiculos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="vazio">Nenhum veículo cadastrado.</td></tr>';
    return;
  }
  tbody.innerHTML = veiculos.map(v => `
    <tr>
      <td>
        <div class="veiculo-info">
          <div class="veiculo-icone">&#128663;</div>
          <div>
            <span class="badge-placa">${v.placa}</span>
            <div class="veiculo-marca">${v.marca || ''} ${v.modelo || ''}</div>
          </div>
        </div>
      </td>
      <td>${v.renavam || '--'}</td>
      <td>${v.chassi || '--'}</td>
      <td>${v.categoria ? `<span class="badge-cidade">${v.categoria}</span>` : '--'}</td>
      <td>${v.ano_modelo || '--'} / ${v.ano_fabricacao || '--'}</td>
      <td>${v.combustivel ? `<span class="badge-cor">${v.combustivel}</span>` : '--'}</td>
      <td>${v.proprietario}</td>
      <td>
        <div class="acoes">
          <button class="btn-icone editar" title="Editar veículo" onclick="editarVeiculo(${v.id})">&#9998;</button>
          <button class="btn-icone deletar" title="Excluir veículo" onclick="deletarVeiculo(${v.id})">&#10005;</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function buscarVeiculos() {
  const termo = document.getElementById('campoBusca').value.toLowerCase();
  const filtrados = todosVeiculos.filter(v =>
    v.placa.toLowerCase().includes(termo) ||
    (v.chassi && v.chassi.toLowerCase().includes(termo))
  );
  renderizarTabela(filtrados);
}

function abrirModal() {
  document.getElementById('modalTitulo').textContent = 'Novo Veículo';
  ['veiculoId','cliente_id','placa','marca','modelo','renavam','chassi','categoria','combustivel','ano_modelo','ano_fabricacao']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('modalOverlay').classList.add('ativo');
}

function fecharModal() {
  document.getElementById('modalOverlay').classList.remove('ativo');
}

async function editarVeiculo(id) {
  const v = todosVeiculos.find(v => v.id === id);
  if (!v) return;
  document.getElementById('modalTitulo').textContent = 'Editar Veículo';
  document.getElementById('veiculoId').value = v.id;
  document.getElementById('cliente_id').value = v.cliente_id;
  document.getElementById('placa').value = v.placa || '';
  document.getElementById('marca').value = v.marca || '';
  document.getElementById('modelo').value = v.modelo || '';
  document.getElementById('renavam').value = v.renavam || '';
  document.getElementById('chassi').value = v.chassi || '';
  document.getElementById('categoria').value = v.categoria || '';
  document.getElementById('combustivel').value = v.combustivel || '';
  document.getElementById('ano_modelo').value = v.ano_modelo || '';
  document.getElementById('ano_fabricacao').value = v.ano_fabricacao || '';
  document.getElementById('modalOverlay').classList.add('ativo');
}

async function salvarVeiculo() {
  const id = document.getElementById('veiculoId').value;
  const dados = {
    cliente_id:     document.getElementById('cliente_id').value,
    placa:          document.getElementById('placa').value,
    marca:          document.getElementById('marca').value,
    modelo:         document.getElementById('modelo').value,
    renavam:        document.getElementById('renavam').value,
    chassi:         document.getElementById('chassi').value,
    categoria:      document.getElementById('categoria').value,
    combustivel:    document.getElementById('combustivel').value,
    ano_modelo:     document.getElementById('ano_modelo').value,
    ano_fabricacao: document.getElementById('ano_fabricacao').value,
  };
  if (!dados.cliente_id || !dados.placa) { alert('Proprietário e placa são obrigatórios!'); return; }
  try {
    const url = id ? `${API}/veiculos/${id}` : `${API}/veiculos`;
    const method = id ? 'PUT' : 'POST';
    await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(dados) });
    fecharModal();
    carregarVeiculos();
  } catch (err) {
    console.error('Erro ao salvar veículo:', err);
  }
}

async function deletarVeiculo(id) {
  if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
  try {
    await fetch(`${API}/veiculos/${id}`, { method: 'DELETE', headers: getHeaders() });
    carregarVeiculos();
  } catch (err) {
    console.error('Erro ao deletar veículo:', err);
  }
}

carregarVeiculos();