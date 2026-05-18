const API = '/api';
const urlParams = new URLSearchParams(window.location.search);
const veiculoId = urlParams.get('id');

let veiculoAtual = null;

function getToken() { return localStorage.getItem('token'); }
function getHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }; }

async function carregarFichaVeiculo() {
    if (!veiculoId) {
        window.location.href = 'veiculos.html';
        return;
    }
    
    try {
        const [resVeiculos, resClientes] = await Promise.all([
            fetch(`${API}/veiculos`, { headers: getHeaders() }),
            fetch(`${API}/clientes`, { headers: getHeaders() })
        ]);

        const veiculos = await resVeiculos.json();
        const clientes = await resClientes.json();

        veiculoAtual = veiculos.find(v => v.id == veiculoId);
        if (!veiculoAtual) {
            alert("Veículo não encontrado!");
            return;
        }

        const dono = clientes.find(c => c.id == veiculoAtual.cliente_id);

        document.getElementById('placaVeiculoH1').textContent = `Veículo: ${veiculoAtual.placa}`;
        document.getElementById('fichaPlaca').textContent = veiculoAtual.placa;
        document.getElementById('fichaDono').textContent = dono ? dono.nome : 'Desconhecido';
        document.getElementById('fichaMarcaModelo').textContent = `${veiculoAtual.marca || '--'} / ${veiculoAtual.modelo || '--'}`;
        document.getElementById('fichaAno').textContent = `${veiculoAtual.ano_fabricacao || '--'} / ${veiculoAtual.ano_modelo || '--'}`;
        document.getElementById('fichaRenavam').textContent = veiculoAtual.renavam || 'Não informado';
        document.getElementById('fichaChassi').textContent = veiculoAtual.chassi || 'Não informado';

        carregarFotosVeiculo();

    } catch (err) {
        console.error("Erro ao carregar dados do veículo:", err);
    }
}

// ---- FUNÇÕES DE EDIÇÃO ----
function abrirModalEditarVeiculo() {
    if (!veiculoAtual) return;
    
    document.getElementById('veiculoId').value = veiculoAtual.id;
    document.getElementById('veiculoClienteId').value = veiculoAtual.cliente_id;
    document.getElementById('veiculoPlaca').value = veiculoAtual.placa || '';
    document.getElementById('veiculoRenavam').value = veiculoAtual.renavam || '';
    document.getElementById('veiculoChassi').value = veiculoAtual.chassi || '';
    document.getElementById('veiculoMarca').value = veiculoAtual.marca || '';
    document.getElementById('veiculoModelo').value = veiculoAtual.modelo || '';
    document.getElementById('veiculoAnoFab').value = veiculoAtual.ano_fabricacao || '';
    document.getElementById('veiculoAnoMod').value = veiculoAtual.ano_modelo || '';
    
    document.getElementById('modalVeiculo').classList.add('ativo');
}

function fecharModalVeiculo() {
    document.getElementById('modalVeiculo').classList.remove('ativo');
}

async function salvarEdicaoVeiculo() {
    const dados = {
        cliente_id: document.getElementById('veiculoClienteId').value,
        placa: document.getElementById('veiculoPlaca').value.toUpperCase(),
        renavam: document.getElementById('veiculoRenavam').value,
        chassi: document.getElementById('veiculoChassi').value.toUpperCase(),
        marca: document.getElementById('veiculoMarca').value,
        modelo: document.getElementById('veiculoModelo').value,
        ano_fabricacao: document.getElementById('veiculoAnoFab').value,
        ano_modelo: document.getElementById('veiculoAnoMod').value
    };

    try {
        const res = await fetch(`${API}/veiculos/${veiculoId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(dados)
        });

        if (!res.ok) {
            const erro = await res.json();
            throw new Error(erro.erro || 'Erro ao atualizar veículo');
        }

        fecharModalVeiculo();
        carregarFichaVeiculo();
        
    } catch (err) {
        alert(`Erro:\n\n${err.message}`);
    }
}

async function carregarFotosVeiculo() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const area = document.getElementById('areaFotosVeiculo');

    if (!area) return; 

    try {
        const res = await fetch(`${API}/portal/buscar-avulsos?veiculo_id=${id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!res.ok) throw new Error('Erro ao buscar fotos');

        const docs = await res.json();

        // FILTRO MÁGICO DO VEÍCULO: Remove CNH, Comprovante e CRV (Deixa só as fotos)
        const docsFiltrados = docs.filter(d => {
            const tipo = d.tipo_documento.toLowerCase();
            return tipo !== 'cnh' && tipo !== 'comprovante' && tipo !== 'crv';
        });

        if (docsFiltrados.length === 0) {
            area.innerHTML = `
                <div class="area-anexos-vazia">
                    <i class="ph ph-image"></i>
                    <span>O cliente ainda não enviou fotos deste veículo.</span>
                </div>`;
            return;
        }

        // Layout limpo e moderno, igual o do cliente
        area.innerHTML = docsFiltrados.map(d => {
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
        console.error("Erro ao carregar fotos:", err);
        area.innerHTML = '<p style="color: red; text-align: center;">Erro ao carregar fotos.</p>';
    }
}

async function uploadDocumentoManual(input, tipoRef) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('documento', file);
    formData.append('tipo_documento', 'Anexo');
    
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (tipoRef === 'cliente') {
        formData.append('cliente_id', id);
    } else {
        formData.append('veiculo_id', id);
    }

    try {
        alert("Enviando arquivo...");
        const res = await fetch(`${API}/portal/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });

        if (res.ok) {
            alert("Arquivo anexado com sucesso!");
            window.location.reload(); 
        } else {
            alert("Erro ao enviar arquivo. Verifique se o backend aceita uploads sem processo.");
        }
    } catch (err) {
        console.error("Erro no upload:", err);
    }
}

document.addEventListener('DOMContentLoaded', carregarFichaVeiculo);