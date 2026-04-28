const API = 'http://localhost:3000/api';
let todosVeiculos = [];
let todosClientes = []; // Adicionado para podermos buscar os nomes dos clientes

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

// Nova função que carrega Veículos e Clientes ao mesmo tempo
async function carregarDadosVeiculos() {
  if (!verificarAuth()) return;
  try {
    const [resVeiculos, resClientes] = await Promise.all([
      fetch(`${API}/veiculos`, { headers: getHeaders() }),
      fetch(`${API}/clientes`, { headers: getHeaders() })
    ]);
    
    if (resVeiculos.status === 401 || resClientes.status === 401) { 
      verificarAuth({ mensagem: 'Token inválido ou expirado' }); 
      return; 
    }
    
    const dadosVeiculos = await resVeiculos.json();
    todosVeiculos = Array.isArray(dadosVeiculos) ? dadosVeiculos : [];

    const dadosClientes = await resClientes.json();
    todosClientes = Array.isArray(dadosClientes) ? dadosClientes : [];
    
    // Preenche o select de clientes no modal
    const select = document.getElementById('veiculoCliente');
    if (select) {
      select.innerHTML = '<option value="">Selecione o Cliente</option>' + 
        todosClientes.map(c => `<option value="${c.id}">${c.nome} (${c.cpf || 'Sem CPF'})</option>`).join('');
    }
    
    renderizarTabela(todosVeiculos);
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
}

function renderizarTabela(veiculos) {
  const tbody = document.getElementById('tabelaVeiculos');
  if (!tbody) return;
  
  if (veiculos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum veículo cadastrado.</td></tr>';
    return;
  }
  
  tbody.innerHTML = veiculos.map(v => {
    // Busca o nome do dono do veículo para mostrar na tabela
    const cliente = todosClientes.find(c => c.id === v.cliente_id);
    const nomeCliente = cliente ? cliente.nome : 'Sem Cliente';

    return `
      <tr>
        <td>
          <div class="veiculo-info">
            <div class="veiculo-icone">${v.modelo?.substring(0, 3).toUpperCase() || 'VEI'}</div>
            <div>
              <strong>${v.marca || '--'}</strong>
              <div class="veiculo-marca">${v.modelo || '--'}</div>
            </div>
          </div>
        </td>
        <td>${nomeCliente}</td>
        <td><span class="badge-placa">${v.placa || '--'}</span></td>
        <td>${v.ano_modelo || '--'}</td>
        <td>
          <div class="acoes">
            <button class="btn-icone ver-ficha" title="Ver Ficha do Veículo" onclick="location.href='detalhes-veiculos.html?id=${v.id}'" style="color: #2563eb; background: #eff6ff;">
              <i class="ph ph-car-profile"></i>
            </button>
            <button class="btn-icone deletar" title="Excluir" onclick="deletarVeiculo(${v.id})"><i class="ph ph-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function editarVeiculo(id) {
  const veiculo = todosVeiculos.find(v => v.id === id);
  if (!veiculo) return;
  
  document.getElementById('modalTitulo').textContent = 'Editar Veículo';
  document.getElementById('veiculoId').value = veiculo.id;
  document.getElementById('veiculoCliente').value = veiculo.cliente_id || '';
  document.getElementById('veiculoPlaca').value = veiculo.placa || '';
  document.getElementById('veiculoRenavam').value = veiculo.renavam || '';
  document.getElementById('veiculoMarca').value = veiculo.marca || '';
  document.getElementById('veiculoModelo').value = veiculo.modelo || '';
  document.getElementById('veiculoCategoria').value = veiculo.categoria || '';
  document.getElementById('veiculoAnoFab').value = veiculo.ano_fabricacao || '';
  document.getElementById('veiculoAnoMod').value = veiculo.ano_modelo || '';
  document.getElementById('veiculoCombustivel').value = veiculo.combustivel || '';
  document.getElementById('veiculoChassi').value = veiculo.chassi || '';
  
  document.getElementById('modalVeiculo').classList.add('ativo');
}

async function salvarVeiculo() {
  const id = document.getElementById('veiculoId')?.value;
  
  // Pegando todos os campos atualizados (sem cor)
  const dados = {
    cliente_id: parseInt(document.getElementById('veiculoCliente').value),
    placa: document.getElementById('veiculoPlaca').value,
    renavam: document.getElementById('veiculoRenavam').value,
    chassi: document.getElementById('veiculoChassi').value,
    categoria: document.getElementById('veiculoCategoria').value,
    ano_modelo: parseInt(document.getElementById('veiculoAnoMod').value) || null,
    ano_fabricacao: parseInt(document.getElementById('veiculoAnoFab').value) || null,
    combustivel: document.getElementById('veiculoCombustivel').value,
    marca: document.getElementById('veiculoMarca').value,
    modelo: document.getElementById('veiculoModelo').value
  };
  
  // O banco exige que cliente e placa não sejam nulos
  if (!dados.cliente_id || !dados.placa) { 
    alert('Cliente e Placa são obrigatórios!'); 
    return; 
  }
  
  try {
    const url = id ? `${API}/veiculos/${id}` : `${API}/veiculos`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { 
      method, 
      headers: getHeaders(), 
      body: JSON.stringify(dados) 
    });
    
    if (!res.ok) throw new Error('Erro ao salvar veículo');
    
    fecharModalVeiculo();
    carregarDadosVeiculos();
  } catch (err) {
   
  }
}

async function deletarVeiculo(id) {
  if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
  
  try {
    const res = await fetch(`${API}/veiculos/${id}`, { 
      method: 'DELETE', 
      headers: getHeaders() 
    });
    
    if (!res.ok) throw new Error('Erro ao deletar veículo');
    
    carregarDadosVeiculos();
  } catch (err) {
    console.error('Erro ao deletar veículo:', err);
    alert('Erro ao deletar veículo!');
  }
}

// Altera a inicialização para chamar a função que carrega veículos + clientes
document.addEventListener('DOMContentLoaded', carregarDadosVeiculos);