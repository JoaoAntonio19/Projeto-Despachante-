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
    
    const qrImg = document.getElementById('qrCodePortal');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(linkCompleto)}`;
    qrImg.style.display = 'block';

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


async function carregarVistoriasHoje() {
    try {
        const res = await fetch('/api/vistorias/hoje', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const vistorias = await res.json();
        
        const container = document.getElementById('listaVistoriasHoje');
        
        if (vistorias.length === 0) {
            container.innerHTML = '<p class="sem-dados">Nenhuma vistoria agendada para hoje.</p>';
            return;
        }

        container.innerHTML = vistorias.map(v => `
            <div class="item-vistoria" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px; margin-bottom: 12px;">
                <div class="info-esq">
                    <span class="hora" style="font-weight: bold; color: #0F172A; font-size: 14px;">
                        ${new Date(v.data_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <div class="info" style="margin-top: 4px;">
                        <strong style="display: block; font-size: 14px;">${v.cliente_nome}</strong>
                        <span style="font-size: 13px; color: #64748B;">Placa: ${v.veiculo_placa} - ${v.local_vistoria}</span>
                    </div>
                    <span class="status" style="font-size: 11px; font-weight: bold; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; background-color: ${v.status === 'Pendente' ? '#FEF3C7' : (v.status === 'Concluída' ? '#D1FAE5' : '#FEE2E2')}; color: ${v.status === 'Pendente' ? '#D97706' : (v.status === 'Concluída' ? '#059669' : '#DC2626')};">
                        ${v.status}
                    </span>
                </div>
                
                <div class="acoes-dir" style="display: flex; gap: 8px;">
                    <button onclick="mudarStatusVistoria(${v.id}, 'Concluída')" title="Marcar como Concluída" style="background: #10B981; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="ph ph-check" style="font-size: 16px;"></i>
                    </button>
                    <button onclick="excluirVistoria(${v.id})" title="Cancelar Vistoria" style="background: #EF4444; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="ph ph-trash" style="font-size: 16px;"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Erro ao carregar vistorias:", err);
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

function salvarNotas() {
    const notas = document.getElementById('blocoNotas').value;
    localStorage.setItem('lembretes_despachante', notas);
    
    const btn = document.querySelector('button[onclick="salvarNotas()"]');
    const textoOriginal = btn.innerText;
    btn.innerText = 'Salvo com sucesso! ✓';
    btn.style.backgroundColor = '#059669'; // Fica verde
    btn.style.color = '#fff';
    
    setTimeout(() => {
        btn.innerText = textoOriginal;
        btn.style.backgroundColor = ''; 
    }, 1000);
}

function carregarNotas() {
    const notasSalvas = localStorage.getItem('lembretes_despachante');
    if (notasSalvas) {
        document.getElementById('blocoNotas').value = notasSalvas;
    }
}


function abrirModalVistoria() {
    document.getElementById('modalVistoria').style.display = 'flex';
    carregarClientesVistoria(); // Puxa os clientes quando clica no botão verde
    document.getElementById('vistoriaVeiculoId').innerHTML = '<option value="">Selecione o Cliente primeiro...</option>';
}

async function carregarClientesVistoria() {
    try {
        const res = await fetch('/api/clientes', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const clientes = await res.json();
        const selectCliente = document.getElementById('vistoriaClienteId');
        
        selectCliente.innerHTML = '<option value="">Selecione o Cliente...</option>';
        clientes.forEach(c => {
            selectCliente.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
        });
    } catch (err) {
        console.error("Erro ao carregar clientes:", err);
    }
}

async function carregarVeiculosVistoria(clienteId) {
    const selectVeiculo = document.getElementById('vistoriaVeiculoId');
    selectVeiculo.innerHTML = '<option value="">Carregando...</option>';

    if (!clienteId) {
        selectVeiculo.innerHTML = '<option value="">Selecione o Cliente primeiro...</option>';
        return;
    }

    try {
        const res = await fetch('/api/veiculos', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const veiculos = await res.json();
        
        const veiculosDoCliente = veiculos.filter(v => v.cliente_id == clienteId);
        
        selectVeiculo.innerHTML = '<option value="">Selecione o Veículo...</option>';
        veiculosDoCliente.forEach(v => {
            selectVeiculo.innerHTML += `<option value="${v.id}">${v.placa} - ${v.marca} ${v.modelo}</option>`;
        });

        if (veiculosDoCliente.length === 0) {
            selectVeiculo.innerHTML = '<option value="">Nenhum veículo cadastrado</option>';
        }

    } catch (err) {
        console.error("Erro ao carregar veículos:", err);
    }
}

function fecharModalVistoria() {
    document.getElementById('modalVistoria').style.display = 'none';
}

async function salvarVistoria() {
    const dataHora = document.getElementById('vistoriaDataHora').value;
    const local = document.getElementById('vistoriaLocal').value;
    const clienteId = document.getElementById('vistoriaClienteId').value;
    const veiculoId = document.getElementById('vistoriaVeiculoId').value;
    const obs = document.getElementById('vistoriaObs').value;

    if(!dataHora || !local || !clienteId || !veiculoId) {
        alert('Por favor, preencha todos os campos com asterisco (*).');
        return;
    }

    try {
        const res = await fetch('/api/vistorias', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                cliente_id: clienteId,
                veiculo_id: veiculoId,
                data_hora: dataHora,
                local_vistoria: local,
                observacoes: obs
            })
        });

        if(res.ok) {
            alert('Vistoria agendada com sucesso!');
            fecharModalVistoria();
            
            document.getElementById('vistoriaDataHora').value = '';
            document.getElementById('vistoriaLocal').value = '';
            document.getElementById('vistoriaClienteId').value = '';
            document.getElementById('vistoriaVeiculoId').value = '';
            document.getElementById('vistoriaObs').value = '';
            
            if(typeof carregarVistoriasHoje === 'function') {
                carregarVistoriasHoje();
            }
        } else {
            const data = await res.json();
            alert('Erro: ' + data.erro);
        }
    } catch(err) {
        console.error("Erro ao salvar vistoria:", err);
        alert('Erro ao conectar com o servidor.');
    }
}

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

// -------------------------------------------------------------
// FUNÇÕES DE AÇÃO DAS VISTORIAS (EXCLUIR E MUDAR STATUS)
// -------------------------------------------------------------
async function excluirVistoria(id) {
    if(!confirm('Tem certeza que deseja cancelar e excluir esta vistoria?')) return;
    
    try {
        const res = await fetch(`/api/vistorias/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if(res.ok) {
            carregarVistoriasHoje(); // Atualiza a lista na hora
        } else {
            alert('Erro ao cancelar a vistoria.');
        }
    } catch(err) {
        console.error("Erro ao excluir:", err);
    }
}

async function mudarStatusVistoria(id, novoStatus) {
    try {
        const res = await fetch(`/api/vistorias/${id}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ status: novoStatus })
        });
        if(res.ok) {
            carregarVistoriasHoje(); // Atualiza a lista e a cor da tag!
        } else {
            alert('Erro ao atualizar o status.');
        }
    } catch(err) {
        console.error("Erro ao mudar status:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if(typeof carregarVistoriasHoje === 'function') carregarVistoriasHoje();
    carregarNotas();
});

document.addEventListener('DOMContentLoaded', carregarDashboard);