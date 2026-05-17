const API = 'http://localhost:3000/api';
const urlParams = new URLSearchParams(window.location.search);
const processoId = urlParams.get('id');

let processoAtual = {};
let clientesGlobais = [];
let veiculosGlobais = [];

function getHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
}
function getToken() { return localStorage.getItem('token'); }

async function carregarTela() {
    if (!processoId) {
        alert("Processo não encontrado!");
        window.location.href = 'processos.html';
        return;
    }

    try {
        const [resProc, resCli, resVei] = await Promise.all([
            fetch(`${API}/processos`, { headers: getHeaders() }),
            fetch(`${API}/clientes`, { headers: getHeaders() }),
            fetch(`${API}/veiculos`, { headers: getHeaders() })
        ]);

        const processos = await resProc.json();
        clientesGlobais = await resCli.json();
        veiculosGlobais = await resVei.json();

        processoAtual = processos.find(p => p.id == processoId);
        
        if (!processoAtual) {
            alert("Processo não encontrado na base!");
            return window.location.href = 'processos.html';
        }

        const cliente = clientesGlobais.find(c => c.id == processoAtual.cliente_id) || { nome: 'Desconhecido' };
        const veiculo = veiculosGlobais.find(v => v.id == processoAtual.veiculo_id) || { placa: 'Desconhecida' };

        document.getElementById('tituloProcesso').textContent = `Processo #${processoAtual.id} - ${(processoAtual.tipo || 'Serviço').toUpperCase()}`;
        document.getElementById('subtituloProcesso').textContent = `Cliente: ${cliente.nome} | Placa: ${veiculo.placa}`;

        await carregarDocumentos();
        await carregarChecklistSeguro();

    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    }
}

async function carregarChecklistSeguro() {
    const area = document.getElementById('areaChecklist');
    try {
        const res = await fetch(`${API}/checklist/${processoId}`, { headers: getHeaders() });
        if (!res.ok) throw new Error("Sem rota de checklist");
        
        const itens = await res.json();
        if (!Array.isArray(itens) || itens.length === 0) throw new Error("Checklist vazio");
        
        area.innerHTML = itens.map(item => `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 8px; border-bottom: 1px solid #F1F5F9;">
                <input type="checkbox" id="item_${item.id}" ${item.concluido ? 'checked' : ''} 
                       style="width: 18px; height: 18px; cursor: pointer;"
                       onchange="atualizarChecklistDB(${item.id}, this.checked)">
                <label for="item_${item.id}" style="cursor: pointer; font-size: 14px; color: ${item.concluido ? '#94A3B8' : '#334155'};">
                    ${item.descricao}
                </label>
            </div>
        `).join('');
    } catch (err) {
        const padroes = ["Documento de Identidade (CNH/RG)", "Comprovante de Endereço", "CRV Assinado", "Laudo de Vistoria"];
        const salvos = JSON.parse(localStorage.getItem(`checklist_mock_${processoId}`)) || {};
        
        area.innerHTML = padroes.map((nome, index) => {
            const isChecked = salvos[index] ? 'checked' : '';
            return `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 8px; border-bottom: 1px solid #F1F5F9;">
                <input type="checkbox" id="item_mock_${index}" ${isChecked} style="width: 18px; height: 18px; cursor: pointer;" onchange="salvarChecklistMock(${index}, this.checked)">
                <label for="item_mock_${index}" style="cursor: pointer; font-size: 14px; color: #0F172A; font-weight: 500;">${nome}</label>
            </div>`;
        }).join('');
    }
}
async function atualizarChecklistDB(itemId, concluido) {
    try { await fetch(`${API}/checklist/${itemId}`, { method: 'PUT', headers: { ...getHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ concluido }) }); } catch(err) {}
}
function salvarChecklistMock(index, isChecked) {
    const key = `checklist_mock_${processoId}`;
    let salvos = JSON.parse(localStorage.getItem(key)) || {};
    salvos[index] = isChecked;
    localStorage.setItem(key, JSON.stringify(salvos));
}

async function carregarDocumentos() {
    const area = document.getElementById('areaDocumentos');
    try {
        const res = await fetch(`${API}/portal/documentos/processo/${processoId}`, { headers: getHeaders() });
        const docs = await res.json();

        if (!Array.isArray(docs) || docs.length === 0) {
            area.innerHTML = `
                <div class="area-anexos-vazia">
                    <i class="ph ph-file-dashed"></i>
                    <span>Nenhum documento anexado ainda.</span>
                </div>`;
            return;
        }

        area.innerHTML = docs.map(d => {
            const caminhoPadronizado = d.caminho.replace(/\\/g, '/');
            const nomeDoArquivo = caminhoPadronizado.split('/').pop();
            const linkArquivo = `${window.location.origin}/uploads/${nomeDoArquivo}`;
            
            return `
                <div style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;">
                        <strong style="display: block; font-size: 11px; color: #64748B; letter-spacing: 0.5px; margin-bottom: 4px;">${d.tipo_documento.toUpperCase()}</strong>
                        <span style="font-size: 14px; color: #0F172A; font-weight: 500;">${d.nome_arquivo || nomeDoArquivo}</span>
                    </div>
                    <a href="${linkArquivo}" target="_blank" class="btn-primary" style="padding: 6px 14px; font-size: 12px; text-decoration: none; border-radius: 6px;">Ver</a>
                </div>
            `;
        }).join('');
    } catch (err) { 
        console.error("Erro ao carregar documentos:", err); 
    }
}

async function uploadDocumentoManual(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('documento', file);
    formData.append('processo_id', processoId);
    formData.append('tipo_documento', 'Anexo'); 

    try {
        alert("Enviando arquivo...");
        const res = await fetch(`${API}/portal/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData });
        if (res.ok) { carregarDocumentos(); input.value = ''; } 
        else { alert("Erro ao enviar arquivo."); }
    } catch (err) { console.error("Erro no upload:", err); }
}

function gerarProcuracaoPDF() {
    window.open(`${API}/pdf/procuracao/${processoId}?token=${getToken()}`, '_blank');
}

async function concluirProcesso() {
    if(!confirm('Tem certeza que deseja marcar este processo como Concluído?')) return;
    
    try {
        const dadosCompletos = {
            cliente_id: processoAtual.cliente_id,
            veiculo_id: processoAtual.veiculo_id,
            tipo: processoAtual.tipo,
            data_abertura: processoAtual.data_abertura ? processoAtual.data_abertura.split('T')[0] : null,
            data_vencimento: processoAtual.data_vencimento ? processoAtual.data_vencimento.split('T')[0] : null,
            observacoes: processoAtual.observacoes,
            status: 'concluido'
        };

        const res = await fetch(`${API}/processos/${processoId}`, {
            method: 'PUT',
            headers: { ...getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosCompletos)
        });
        
        if (res.ok) {
            alert("Processo concluído com sucesso!");
            window.location.href = 'processos.html';
        } else {
            alert("Erro ao concluir o processo.");
        }
    } catch (err) {
        console.error("Erro ao concluir processo:", err);
    }
}

function editarProcesso() {
    const selCli = document.getElementById('editProcessoCliente');
    const selVei = document.getElementById('editProcessoVeiculo');
    selCli.innerHTML = clientesGlobais.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    selVei.innerHTML = veiculosGlobais.map(v => `<option value="${v.id}">${v.placa} - ${v.marca}</option>`).join('');

    document.getElementById('editProcessoCliente').value = processoAtual.cliente_id;
    document.getElementById('editProcessoVeiculo').value = processoAtual.veiculo_id;
    document.getElementById('editProcessoTipo').value = processoAtual.tipo || 'transferencia';
    document.getElementById('editProcessoDataAbertura').value = processoAtual.data_abertura ? processoAtual.data_abertura.split('T')[0] : '';
    document.getElementById('editProcessoDataVencimento').value = processoAtual.data_vencimento ? processoAtual.data_vencimento.split('T')[0] : '';
    document.getElementById('editProcessoStatus').value = processoAtual.status || 'aberto';
    document.getElementById('editProcessoObservacoes').value = processoAtual.observacoes || '';

    document.getElementById('modalProcessoEdit').classList.add('ativo');
}

function fecharModalProcessoEdit() {
    document.getElementById('modalProcessoEdit').classList.remove('ativo');
}

async function salvarProcessoEdicao() {
    const dados = {
        cliente_id: parseInt(document.getElementById('editProcessoCliente').value),
        veiculo_id: parseInt(document.getElementById('editProcessoVeiculo').value),
        tipo: document.getElementById('editProcessoTipo').value,
        data_abertura: document.getElementById('editProcessoDataAbertura').value,
        data_vencimento: document.getElementById('editProcessoDataVencimento').value,
        status: document.getElementById('editProcessoStatus').value,
        observacoes: document.getElementById('editProcessoObservacoes').value,
    };

    try {
        const res = await fetch(`${API}/processos/${processoAtual.id}`, {
            method: 'PUT',
            headers: { ...getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (res.ok) {
            alert('Processo atualizado com sucesso!');
            window.location.reload(); 
        } else {
            alert('Erro ao atualizar processo.');
        }
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar.');
    }
}

async function excluirProcessoAtual() {
    if(!confirm('Tem certeza que deseja excluir DE VEZ este processo?')) return;
    try {
        const res = await fetch(`${API}/processos/${processoId}`, { method: 'DELETE', headers: getHeaders() });
        if (res.ok) { alert("Processo excluído!"); window.location.href = 'processos.html'; }
    } catch (err) {}
}

document.addEventListener('DOMContentLoaded', carregarTela);