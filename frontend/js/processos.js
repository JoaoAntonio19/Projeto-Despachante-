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
  
  if (!Array.isArray(processos) || processos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="vazio">Nenhum processo cadastrado.</td></tr>';
    return;
  }
  
  tbody.innerHTML = processos.map(p => {
    const cliente = todosClientes.find(c => c.id === p.cliente_id);
    const veiculo = todosVeiculos.find(v => v.id === p.veiculo_id);
    const statusClass = p.status || 'aberto';
    
    // --- SUA CALCULADORA DE PRAZO ---
    let prazoTexto = '--';
    if (p.data_vencimento) {
      const vencimento = new Date(p.data_vencimento.split('T')[0] + 'T00:00:00');
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      
      const diferencaDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
      
      if (diferencaDias > 0) {
        prazoTexto = `${diferencaDias} dias`;
      } else if (diferencaDias === 0) {
        prazoTexto = `<span style="color: #ea580c; font-weight: bold;">Vence Hoje!</span>`;
      } else {
        prazoTexto = `<span style="color: #dc2626; font-weight: bold;">Atrasado (${Math.abs(diferencaDias)} dias)</span>`;
      }
    }

    const dataAberturaFmt = p.data_abertura ? new Date(p.data_abertura).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--';
    
    return `
      <tr>
        <td>${cliente?.nome || '--'}</td>
        <td>${p.tipo || '--'}</td>
        <td><span class="badge-placa">${veiculo?.placa || '--'}</span></td>
        <td>${dataAberturaFmt}</td>
        <td>${prazoTexto}</td> 
        <td><span class="badge-status ${statusClass}">${p.status || 'Aberto'}</span></td>
        <td>
          <div class="acoes">
            <button class="btn-icone pdf" title="Gerar Procuração" onclick="gerarPDF(${p.id})">PDF</button>
            <button class="btn-icone checklist" title="Verificar Documentos" onclick="abrirChecklist(${p.id})">CHECKLIST</button>
            
            <button class="btn-icone editar" title="Editar" onclick="editarProcesso(${p.id})"><i class="ph ph-pencil-simple"></i></button>
            <button class="btn-icone deletar" title="Excluir" onclick="deletarProcesso(${p.id})"><i class="ph ph-trash"></i></button>
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
  document.getElementById('processoDataVencimento').value = processo.data_vencimento?.split('T')[0] || '';
  document.getElementById('processoStatus').value = processo.status || 'aberto';
  document.getElementById('processoObservacoes').value = processo.observacoes || '';
  
  document.getElementById('modalProcesso').classList.add('ativo');
}

async function salvarProcesso() {
  const id = document.getElementById('processoId')?.value;
  const dados = {
    cliente_id:     parseInt(document.getElementById('processoCliente').value),
    veiculo_id:     parseInt(document.getElementById('processoVeiculo').value),
    tipo:           document.getElementById('processoTipo').value,
    data_abertura:  document.getElementById('processoDataAbertura').value,
    data_vencimento: document.getElementById('processoDataVencimento').value,
    status:         document.getElementById('processoStatus').value,
    observacoes:    document.getElementById('processoObservacoes').value,
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

function gerarPDF(processoId) {
  const token = localStorage.getItem('token');
  window.open(`${API}/pdf/procuracao/${processoId}?token=${getToken()}`, '_blank');
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

// --- FUNÇÕES DO MODAL DE CHECKLIST ---
function fecharModalChecklist() {
    document.getElementById('modalChecklist').classList.remove('ativo');
}

async function abrirChecklist(processoId) {
    const modal = document.getElementById('modalChecklist');
    const lista = document.getElementById('listaChecklist');
    
    modal.classList.add('ativo');
    lista.innerHTML = '<p style="text-align:center; padding:20px;">Conferindo documentos no servidor...</p>';

    try {
        const resSol = await fetch(`${API}/portal/pendentes`, { headers: getHeaders() });
        const solicitacoes = await resSol.json();
        
        const solicitacaoDoProcesso = solicitacoes.find(s => s.processo_id === processoId);

        if (!solicitacaoDoProcesso) {
            // AGORA SIM, HTML LIMPO SEM CSS MISTURADO!
            lista.innerHTML = `
                <div class="checklist-vazio">
                    <p>⚠️ Nenhuma solicitação de portal vinculada a este processo.</p>
                    <button class="btn-gerar-link-modal" onclick="fecharModalChecklist(); gerarLinkProcesso(${processoId})">
                        Gerar Link para o Cliente
                    </button>
                </div>`;
            return;
        }

        const resDocs = await fetch(`${API}/portal/documentos/${solicitacaoDoProcesso.id}`, { headers: getHeaders() });
        const docsEnviados = await resDocs.json();

        const obrigatorios = [
            { id: 'cnh', nome: 'CNH / Identidade' },
            { id: 'comprovante', nome: 'Comprovante de Endereço' },
            { id: 'crv', nome: 'CRV (Documento do Carro)' }
        ];

        lista.innerHTML = obrigatorios.map(item => {
            const recebido = docsEnviados.some(d => d.tipo_documento === item.id);
            return `
                <div class="item-checklist" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #f1f5f9;">
                    <span style="font-weight:500; color:#1e293b;">${item.nome}</span>
                    <span style="font-weight:bold;">
                        ${recebido 
                            ? '<span style="color:#16a34a;">✅ Recebido</span>' 
                            : '<span style="color:#dc2626;">❌ Faltando</span>'}
                    </span>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Erro no checklist:", err);
        lista.innerHTML = '<p style="color:red; text-align:center;">Erro ao processar checklist. Tente novamente.</p>';
    }
}

// --- FUNÇÕES DE GERAR LINK DO PROCESSO ---
async function gerarLinkProcesso(processoId) {
  try {
    const res = await fetch(`${API}/portal/gerar-link`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ processo_id: processoId }) 
    });

    if (!res.ok) throw new Error('Erro ao gerar link no servidor');

    const dados = await res.json();
    const linkCompleto = `${window.location.origin}/portal-cliente.html?token=${dados.token}`;

    document.getElementById('linkGerado').value = linkCompleto;
    document.getElementById('modalLink').classList.add('ativo');
  } catch (err) {
    console.error(err);
    alert('Erro ao gerar link para o processo.');
  }
}

function fecharModalLink() {
  document.getElementById('modalLink').classList.remove('ativo');
}

function copiarLink() {
  const input = document.getElementById('linkGerado');
  input.select();
  document.execCommand('copy');
  
  const msg = document.getElementById('linkCopiado');
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; }, 2000);
}

document.addEventListener('DOMContentLoaded', carregarDados);