const API = 'http://localhost:3000/api';
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

async function carregarVeiculos() {
  if (!verificarAuth()) return;
  try {
    const res = await fetch(`${API}/veiculos`, { headers: getHeaders() });
    if (res.status === 401 || res.status === 403) { 
      verificarAuth({ mensagem: 'Token inválido ou expirado' }); 
      return; 
    }
    const dados = await res.json();
    todosVeiculos = Array.isArray(dados) ? dados : [];
    renderizarTabela(todosVeiculos);
  } catch (err) {
    console.error('Erro ao carregar veículos:', err);
  }
}

function renderizarTabela(veiculos) {
  const tbody = document.getElementById('tabelaVeiculos');
  if (!tbody) return;
  
  if (veiculos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum veículo cadastrado.</td></tr>';
    return;
  }
  
  tbody.innerHTML = veiculos.map(v => `
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
      <td>${v.marca || '--'}</td>
      <td><span class="badge-placa">${v.placa || '--'}</span></td>
      <td>${v.cor ? `<span class="badge-cor">${v.cor}</span>` : '--'}</td>
      <td>
        <div class="acoes">
          <button class="btn-icone editar" title="Editar" onclick="editarVeiculo(${v.id})">✎</button>
          <button class="btn-icone deletar" title="Excluir" onclick="deletarVeiculo(${v.id})">✕</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function editarVeiculo(id) {
  const veiculo = todosVeiculos.find(v => v.id === id);
  if (!veiculo) return;
  
  document.getElementById('modalTitulo').textContent = 'Editar Veículo';
  document.getElementById('veiculoId').value = veiculo.id;
  document.getElementById('veiculoMarca').value = veiculo.marca || '';
  document.getElementById('veiculoModelo').value = veiculo.modelo || '';
  document.getElementById('veiculoPlaca').value = veiculo.placa || '';
  document.getElementById('veiculoAno').value = veiculo.ano || '';
  document.getElementById('veiculoCor').value = veiculo.cor || '';
  document.getElementById('veiculoChassi').value = veiculo.chassi || '';
  
  document.getElementById('modalVeiculo').classList.add('ativo');
}

async function salvarVeiculo() {
  const id = document.getElementById('veiculoId')?.value;
  const dados = {
    marca:   document.getElementById('veiculoMarca').value,
    modelo:  document.getElementById('veiculoModelo').value,
    placa:   document.getElementById('veiculoPlaca').value,
    ano:     parseInt(document.getElementById('veiculoAno').value),
    cor:     document.getElementById('veiculoCor').value,
    chassi:  document.getElementById('veiculoChassi').value,
  };
  
  if (!dados.marca || !dados.placa) { 
    alert('Marca e Placa são obrigatórias!'); 
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
    carregarVeiculos();
  } catch (err) {
    console.error('Erro ao salvar veículo:', err);
    alert('Erro ao salvar veículo!');
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
    
    carregarVeiculos();
  } catch (err) {
    console.error('Erro ao deletar veículo:', err);
    alert('Erro ao deletar veículo!');
  }
}

document.addEventListener('DOMContentLoaded', carregarVeiculos);