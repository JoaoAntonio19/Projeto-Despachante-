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
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Function retained from your original code
async function buscarCEP() {
  const cep = document.getElementById('clienteCEP')?.value.replace(/\D/g, '');
  if (!cep || cep.length !== 8) return;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dados = await res.json();
    if (dados.erro) { alert('CEP não encontrado.'); return; }
    const endereco = document.getElementById('clienteEndereco');
    const cidade = document.getElementById('clienteCidade');
    // Assuming you might add an estado field later to viacep
    const estado = document.getElementById('clienteEstado'); 
    
    if (endereco) endereco.value = `${dados.logradouro}, ${dados.bairro}`;
    if (cidade) cidade.value = dados.localidade;
    if (estado) estado.value = dados.uf; // ViaCEP returns 'uf'
  } catch (err) {
    console.error('Erro ao buscar CEP:', err);
  }
}

async function carregarClientes() {
  if (!verificarAuth()) return;
  try {
    const res = await fetch(`${API}/clientes`, { headers: getHeaders() });
    if (res.status === 401 || res.status === 403) { 
      verificarAuth({ mensagem: 'Token inválido ou expirado' }); 
      return; 
    }
    const dados = await res.json();
    todosClientes = Array.isArray(dados) ? dados : [];
    renderizarTabela(todosClientes);
  } catch (err) {
    console.error('Erro ao carregar clientes:', err);
  }
}

function renderizarTabela(clientes) {
  const tbody = document.getElementById('tabelaClientes');
  if (!tbody) return;
  
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
        <td>${c.cpf || '--'}</td>
        <td>${c.telefone || '--'}</td>
        <td>${c.cidade ? `<span class="badge-cidade">${c.cidade}</span>` : '--'}</td>
        <td>
          <div class="acoes">
            <button class="btn-icone editar" title="Editar" onclick="editarCliente(${c.id})"><i class="ph ph-pencil-simple"></i></button>
            <button class="btn-icone deletar" title="Excluir" onclick="deletarCliente(${c.id})"><i class="ph ph-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function editarCliente(id) {
  const cliente = todosClientes.find(c => c.id === id);
  if (!cliente) return;
  
  document.getElementById('modalTitulo').textContent = 'Editar Cliente';
  document.getElementById('clienteId').value = cliente.id;
  document.getElementById('clienteNome').value = cliente.nome || '';
  document.getElementById('clienteCPF').value = cliente.cpf || ''; // Fixed capitalization mismatch
  document.getElementById('clienteTelefone').value = cliente.telefone || '';
  document.getElementById('clienteEmail').value = cliente.email || '';
  document.getElementById('clienteEndereco').value = cliente.endereco || '';
  document.getElementById('clienteCidade').value = cliente.cidade || '';
  document.getElementById('clienteEstado').value = cliente.estado || '';
  
  document.getElementById('modalCliente').classList.add('ativo');
}

async function salvarCliente() {
  const id = document.getElementById('clienteId')?.value;
  const dados = {
    nome:     document.getElementById('clienteNome').value,
    cpf:      document.getElementById('clienteCPF').value,
    telefone: document.getElementById('clienteTelefone').value,
    email:    document.getElementById('clienteEmail').value,
    endereco: document.getElementById('clienteEndereco').value,
    cidade:   document.getElementById('clienteCidade').value,
    estado:   document.getElementById('clienteEstado').value,
  };
  
  if (!dados.nome || !dados.cpf) { 
    alert('Nome e CPF são obrigatórios!'); 
    return; 
  }
  
  try {
    const url = id ? `${API}/clientes/${id}` : `${API}/clientes`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { 
      method, 
      headers: getHeaders(), 
      body: JSON.stringify(dados) 
    });
    
    if (!res.ok) throw new Error('Erro ao salvar cliente');
    
    // Attempt to close modal if the function exists
    if(typeof fecharModalCliente === 'function') fecharModalCliente();
    
    carregarClientes();
  } catch (err) {
    console.error('Erro ao salvar cliente:', err);
    alert('Erro ao salvar cliente!');
  }
}

async function deletarCliente(id) {
  if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
  
  try {
    const res = await fetch(`${API}/clientes/${id}`, { 
      method: 'DELETE', 
      headers: getHeaders() 
    });
    
    if (!res.ok) throw new Error('Erro ao deletar cliente');
    
    carregarClientes();
  } catch (err) {
    console.error('Erro ao deletar cliente:', err);
    alert('Erro ao deletar cliente!');
  }
}

// Carrega clientes ao abrir a página
document.addEventListener('DOMContentLoaded', carregarClientes);