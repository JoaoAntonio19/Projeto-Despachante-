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
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const area = document.getElementById('areaDocsCliente');

    if (!area) return; 

    try {
        const res = await fetch(`${API}/portal/buscar-avulsos?cliente_id=${id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!res.ok) throw new Error('Erro ao buscar documentos');

        const docs = await res.json();

        if (docs.length === 0) {
            area.innerHTML = `
                <div class="area-anexos-vazia">
                    <i class="ph ph-file-text"></i>
                    <span>Nenhum documento anexado diretamente a este cliente.</span>
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
        area.innerHTML = '<p style="color: red; text-align: center;">Erro ao carregar documentos.</p>';
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

document.addEventListener('DOMContentLoaded', carregarFichaCompleta);