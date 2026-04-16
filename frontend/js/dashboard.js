const API = 'http://localhost:3000/api';

async function carregarDados() {
  try {
    const [clientes, veiculos, processos, alertas] = await Promise.all([
      fetch(`${API}/clientes`).then(r => r.json()),
      fetch(`${API}/veiculos`).then(r => r.json()),
      fetch(`${API}/processos`).then(r => r.json()),
      fetch(`${API}/processos/alertas`).then(r => r.json()),
    ]);

    document.getElementById('totalClientes').textContent = clientes.length;
    document.getElementById('totalVeiculos').textContent = veiculos.length;
    document.getElementById('totalAbertos').textContent =
      processos.filter(p => p.status === 'aberto' || p.status === 'em_andamento').length;
    document.getElementById('totalAlertas').textContent = alertas.length;

    const tbody = document.getElementById('tabelaAlertas');
    if (alertas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum processo com prazo próximo.</td></tr>';
      return;
    }
    tbody.innerHTML = alertas.map(p => {
      const hoje = new Date();
      const venc = new Date(p.data_vencimento);
      const diff = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
      return `
        <tr>
          <td>${p.cliente_nome || '--'}</td>
          <td>${p.tipo}</td>
          <td>${p.veiculo_placa || '--'}</td>
          <td style="color: ${diff <= 7 ? '#e74c3c' : '#f39c12'}; font-weight: bold;">
            ${venc.toLocaleDateString('pt-BR')}
          </td>
          <td><span class="badge-status ${p.status}">${p.status.replace('_', ' ')}</span></td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
}

async function gerarLinkPortal() {
  try {
    const res = await fetch(`${API}/portal/gerar-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const dados = await res.json();
    const linkCompleto = `http://localhost:3000${dados.link}`;

    document.getElementById('linkGerado').value = linkCompleto;
    document.getElementById('linkCopiado').style.display = 'none';
    document.getElementById('modalLink').classList.add('ativo');
  } catch (err) {
    console.error('Erro ao gerar link:', err);
    alert('Erro ao gerar link. Verifique se o servidor está rodando.');
  }
}

function copiarLink() {
  const input = document.getElementById('linkGerado');
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    document.getElementById('linkCopiado').style.display = 'block';
  }).catch(() => {
    document.execCommand('copy');
    document.getElementById('linkCopiado').style.display = 'block';
  });
}

function fecharModalLink() {
  document.getElementById('modalLink').classList.remove('ativo');
}

async function carregarSolicitacoes() {
  try {
    const solicitacoes = await fetch(`${API}/portal/pendentes`).then(r => r.json());
    const div = document.getElementById('listaSolicitacoes');

    if (solicitacoes.length === 0) {
      div.innerHTML = '<p class="vazio">Nenhuma solicitação recebida ainda.</p>';
      return;
    }

    div.innerHTML = solicitacoes.map(s => `
  <div class="solicitacao-card">
    <div class="solicitacao-info">
      <div>
        <span class="solicitacao-status ${s.status}">${s.status}</span>
        <span class="solicitacao-data">${new Date(s.criado_em).toLocaleDateString('pt-BR')} às ${new Date(s.criado_em).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
      </div>
      <span class="solicitacao-cliente">${s.cliente_nome || 'Aguardando preenchimento...'}</span>
    </div>
    <div style="display:flex; gap:8px; align-items:center;">
      ${s.status === 'concluido' ? `
        <button class="btn-ver-docs" onclick="verDocumentos(${s.id})">Ver Documentos</button>
      ` : `
        <span class="aguardando">Aguardando preenchimento...</span>
      `}
      <button class="btn-icone deletar" title="Excluir solicitação" onclick="deletarSolicitacao(${s.id})" style="width:28px; height:28px; font-size:12px;">&#10005;</button>
    </div>
  </div>
`).join('');
  } catch (err) {
    console.error('Erro ao carregar solicitações:', err);
  }
}

async function verDocumentos(solicitacaoId) {
  try {
    const docs = await fetch(`${API}/portal/documentos/${solicitacaoId}`).then(r => r.json());

    if (docs.length === 0) {
      alert('Nenhum documento foi enviado nesta solicitação.');
      return;
    }

    const nomes = { cnh: 'CNH', comprovante: 'Comprovante de Endereço', crv: 'CRV / Documento do Veículo' };

    let html = '<div style="display:flex; flex-direction:column; gap:12px;">';
    docs.forEach(doc => {
      const nomeArquivo = doc.caminho.split('\\').pop().split('/').pop();
      const url = `http://localhost:3000/uploads/${nomeArquivo}`;
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f0f4f8;">
          <span style="font-size:14px; color:#1a3a5c; font-weight:bold;">${nomes[doc.tipo_documento] || doc.tipo_documento}</span>
          <a href="${url}" target="_blank" class="btn-copiar" style="text-decoration:none; font-size:12px;">Abrir arquivo</a>
        </div>
      `;
    });
    html += '</div>';

    document.getElementById('docsConteudo').innerHTML = html;
    document.getElementById('modalDocs').classList.add('ativo');
  } catch (err) {
    console.error('Erro ao carregar documentos:', err);
  }
}

function fecharModalDocs() {
  document.getElementById('modalDocs').classList.remove('ativo');
}

async function deletarSolicitacao(id) {
  if (!confirm('Excluir esta solicitação?')) return;
  try {
    await fetch(`${API}/portal/${id}`, { method: 'DELETE' });
    carregarSolicitacoes();
  } catch (err) {
    console.error('Erro ao deletar solicitação:', err);
  }
}

carregarDados();
carregarSolicitacoes();
