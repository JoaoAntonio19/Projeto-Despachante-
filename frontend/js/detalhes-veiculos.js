const API = 'http://localhost:3000/api';
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
    try {
        const res = await fetch(`${API}/veiculos/${veiculoId}/fotos`, { headers: getHeaders() });
        const fotos = await res.json();
        
        const galeria = document.getElementById('galeriaFotos');
        
        if (fotos.length === 0) return; 

        galeria.className = 'dado-grid'; 
        
        galeria.innerHTML = fotos.map(f => {
            const arq = f.caminho.split(/[\\/]/).pop();
            
            const nomesBacaninhas = {
                'crv': 'CRV / Documento',
                'fotoFrente': 'Foto da Frente',
                'fotoTraseira': 'Foto da Traseira',
                'fotoLateral': 'Foto Lateral',
                'fotoPainel': 'Painel (KM)',
                'fotosExtras': 'Foto Extra'
            };
            const nomeExibicao = nomesBacaninhas[f.tipo_documento] || 'Foto Anexada';

            return `
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <span style="display: block; font-weight: 600; font-size: 11px; color: #475569; margin-bottom: 8px; text-transform: uppercase;">
                    ${nomeExibicao}
                </span>
                <a href="http://localhost:3000/uploads/${arq}" target="_blank" title="Clique para ampliar">
                    <img src="http://localhost:3000/uploads/${arq}" alt="${nomeExibicao}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; transition: 0.2s;">
                </a>
            </div>`;
        }).join('');
        
    } catch (err) {
        console.error("Erro ao carregar fotos do veículo:", err);
        document.getElementById('galeriaFotos').innerHTML = '<p style="color: red; font-size: 13px;">Erro ao carregar fotos.</p>';
    }
}

document.addEventListener('DOMContentLoaded', carregarFichaVeiculo);