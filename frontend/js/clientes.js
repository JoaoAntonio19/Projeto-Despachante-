const API = 'http://localhost:3000/api';
let todosClientes = [];

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
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

async function buscarCEP() {
  const cep = document.getElementById('cep').value.replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dados = await res.json();
    if (dados.erro) { alert('CEP não encontrado.'); return; }
    document.getElementById('endereco').value = `${dados.logradouro}, ${dados.bairro}`;
    document.getElementById('cidade').value = dados.localidade;
  } catch (err) {
    console.error('Erro ao buscar CEP:', err);
  }
}

async function carregarClientes() {
  if (!verificarAuth()) return;
  try {
    const res = await fetch(`${API}/clientes`, { headers: getHeaders() });
    if (res.status === 401 || res.status === 403) { verificarAuth({ mensagem: 'Token inválido ou expirado' }); return; }
    const dados = await res.json();
    todosClientes = Array.isArray(dados) ? dados : [];
    renderizarTabela(todosClientes);
  } catch (err) {
    console.error('Erro ao carregar clientes:', err);
  }
}

function renderizarTabela(clientes) {
  const tbody = document.getElementById('tabelaClientes');
  if (clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum cliente cadastrado.</td></tr>';
    return;
  }
  tbody.innerHTML = clientes.map(c => {
    const iniciais = c.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    return `
      <tr>
        <td>
          <div class="cliente-info">
            <div class="avatar">${iniciais}</div>
            <span class="cliente-nome">${c.nome}</span>
          </div>
        </td>
        <td>${c.cpf}</td>
        <td>${c.telefone || '--'}</td>
        <td>${c.cidade ? `<span class="badge-cidade">${c.cidade}</span>` : '--'}</td>
        <td>
          <div class="acoes">
            <button class="btn-icone editar" title="Editar" onclick="editarCliente(${c.id})">✎</button>
            <button class="btn-icone deletar" title="Excluir" onclick="deletarCliente(${c.id})">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function buscarClientes() {
  const termo = document.getElementById('campoBusca').value.toLowerCase();
  const filtrados = todosClientes.filter(c =>
    c.nome.toLowerCase().includes(termo) || c.cpf.includes(termo)
  );
  renderizarTabela(filtrados);
}

function abrirModal() {
  document.getElementById('modalTitulo').textContent = 'Novo Cliente';
  document.getElementById('clienteId').value = '';
  ['nome','cpf','telefone','email','cep','endereco','cidade']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('modalOverlay').classList.add('ativo');
}

function fecharModal() {
  document.getElementById('modalOverlay').classList.remove('ativo');
}

async function editarCliente(id) {
  const cliente = todosClientes.find(c => c.id === id);
  if (!cliente) return;
  document.getElementById('modalTitulo').textContent = 'Editar Cliente';
  document.getElementById('clienteId').value = cliente.id;
  document.getElementById('nome').value = cliente.nome || '';
  document.getElementById('cpf').value = cliente.cpf || '';
  document.getElementById('telefone').value = cliente.telefone || '';
  document.getElementById('email').value = cliente.email || '';
  document.getElementById('cep').value = cliente.cep || '';
  document.getElementById('endereco').value = cliente.endereco || '';
  document.getElementById('cidade').value = cliente.cidade || '';
  document.getElementById('modalOverlay').classList.add('ativo');
}

async function salvarCliente() {
  const id = document.getElementById('clienteId').value;
  const dados = {
    nome:     document.getElementById('nome').value,
    cpf:      document.getElementById('cpf').value,
    rg:       null,
    telefone: document.getElementById('telefone').value,
    email:    document.getElementById('email').value,
    cep:      document.getElementById('cep').value,
    endereco: document.getElementById('endereco').value,
    cidade:   document.getElementById('cidade').value,
  };
  if (!dados.nome || !dados.cpf) { alert('Nome e CPF são obrigatórios!'); return; }
  try {
    const url = id ? `${API}/clientes/${id}` : `${API}/clientes`;
    const method = id ? 'PUT' : 'POST';
    await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(dados) });
    fecharModal();
    carregarClientes();
  } catch (err) {
    console.error('Erro ao salvar cliente:', err);
  }
}

async function deletarCliente(id) {
  if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
  try {
    await fetch(`${API}/clientes/${id}`, { method: 'DELETE', headers: getHeaders() });
    carregarClientes();
  } catch (err) {
    console.error('Erro ao deletar cliente:', err);
  }
}

carregarClientes();