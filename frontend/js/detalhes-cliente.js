const API = 'http://localhost:3000/api';
const urlParams = new URLSearchParams(window.location.search);
const clienteId = urlParams.get('id');

let clienteAtual = null; // Guarda os dados do cliente para preencher o formulário depois

function getToken() { return localStorage.getItem('token'); }
function getHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }; }

async function carregarFichaCompleta() {
    if (!clienteId) {
        window.location.href = 'clientes.html';
        return;
    }
    
    try {
        // Busca apenas os clientes agora
        const resClientes = await fetch(`${API}/clientes`, { headers: getHeaders() });
        const clientes = await resClientes.json();

        clienteAtual = clientes.find(c => c.id == clienteId);
        if (!clienteAtual) {
            alert("Cliente não encontrado!");
            return;
        }

        // Preencher Tela
        document.getElementById('nomeClienteH1').textContent = clienteAtual.nome;
        document.getElementById('fichaCpf').textContent = clienteAtual.cpf || 'Não informado';
        document.getElementById('fichaTelefone').textContent = clienteAtual.telefone || 'Não informado';
        document.getElementById('fichaEmail').textContent = clienteAtual.email || 'Não informado';
        
        const enderecoCompleto = `${clienteAtual.endereco || ''} ${clienteAtual.cidade ? '- ' + clienteAtual.cidade : ''} ${clienteAtual.estado ? '/' + clienteAtual.estado : ''} ${clienteAtual.cep ? '(CEP: ' + clienteAtual.cep + ')' : ''}`;
        document.getElementById('fichaEndereco').textContent = enderecoCompleto.trim() || 'Não informado';

        carregarDocumentosCliente(); 

    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    }
}

// ---- FUNÇÕES DE EDIÇÃO ----

function abrirModalEditar() {
    if (!clienteAtual) return;
    
    document.getElementById('clienteId').value = clienteAtual.id;
    document.getElementById('clienteNome').value = clienteAtual.nome || '';
    document.getElementById('clienteCpf').value = clienteAtual.cpf || '';
    document.getElementById('clienteTelefone').value = clienteAtual.telefone || '';
    document.getElementById('clienteEmail').value = clienteAtual.email || '';
    document.getElementById('clienteCep').value = clienteAtual.cep || '';
    document.getElementById('clienteEndereco').value = clienteAtual.endereco || '';
    document.getElementById('clienteCidade').value = clienteAtual.cidade || '';
    document.getElementById('clienteEstado').value = clienteAtual.estado || '';
    
    document.getElementById('modalCliente').classList.add('ativo');
}

function fecharModalCliente() {
    document.getElementById('modalCliente').classList.remove('ativo');
}

async function salvarEdicao() {
    const dados = {
        nome: document.getElementById('clienteNome').value,
        cpf: document.getElementById('clienteCpf').value,
        telefone: document.getElementById('clienteTelefone').value,
        email: document.getElementById('clienteEmail').value,
        cep: document.getElementById('clienteCep').value,
        endereco: document.getElementById('clienteEndereco').value,
        cidade: document.getElementById('clienteCidade').value,
        estado: document.getElementById('clienteEstado').value
    };

    try {
        const res = await fetch(`${API}/clientes/${clienteId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(dados)
        });

        if (!res.ok) {
            const erro = await res.json();
            throw new Error(erro.erro || 'Erro ao atualizar');
        }

        fecharModalCliente();
        // Recarrega a ficha na hora para mostrar os dados atualizados!
        carregarFichaCompleta(); 
        
    } catch (err) {
        alert(`O banco de dados recusou a edição:\n\n${err.message}`);
    }
}

function gerarProcuracao() {
    alert("Em breve! Sistema conectando com gerador de PDF...");
}

async function carregarDocumentosCliente() {
    try {
        const res = await fetch(`${API}/clientes/${clienteId}/documentos`, { headers: getHeaders() });
        const docs = await res.json();
        
        const galeria = document.getElementById('galeriaDocumentos');
        
        if (docs.length === 0) {
            galeria.innerHTML = '<p style="color: #64748b; font-size: 13px; grid-column: span 2;">Nenhum documento anexado pelo portal.</p>';
            return;
        }

        galeria.innerHTML = docs.map(d => {
            const arq = d.caminho.split(/[\\/]/).pop();
            const nomeAmigavel = d.tipo_documento === 'cnh' ? 'CNH' : 'Comprovante de Endereço';
            
            const isPdf = arq.toLowerCase().endsWith('.pdf');

            if (isPdf) {
                return `
                <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <span style="display: block; font-weight: 600; font-size: 11px; color: #475569; margin-bottom: 8px; text-transform: uppercase;">${nomeAmigavel}</span>
                    <div style="height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; border-radius: 6px; border: 1px dashed #cbd5e1;">
                        <i class="ph ph-file-pdf" style="font-size: 40px; color: #ef4444; margin-bottom: 10px;"></i>
                        <a href="http://localhost:3000/uploads/${arq}" target="_blank" class="btn-primary" style="padding: 4px 12px; font-size: 11px;">Abrir PDF</a>
                    </div>
                </div>`;
            } else {
                // Se for Imagem (PNG, JPG), mostra a foto aberta igual no veículo
                return `
                <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <span style="display: block; font-weight: 600; font-size: 11px; color: #475569; margin-bottom: 8px; text-transform: uppercase;">
                        ${nomeAmigavel}
                    </span>
                    <a href="http://localhost:3000/uploads/${arq}" target="_blank" title="Clique para ampliar">
                        <img src="http://localhost:3000/uploads/${arq}" alt="${nomeAmigavel}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; transition: 0.2s;">
                    </a>
                </div>`;
            }
        }).join('');
        
    } catch (err) {
        console.error("Erro ao carregar documentos:", err);
        document.getElementById('galeriaDocumentos').innerHTML = '<p style="color: red; font-size: 13px;">Erro ao carregar documentos.</p>';
    }
}

document.addEventListener('DOMContentLoaded', carregarFichaCompleta);