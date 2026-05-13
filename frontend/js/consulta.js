const API = 'http://localhost:3000/api';

// Funções de autenticação (iguais às das outras telas)
function getToken() {
  return localStorage.getItem('token');
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

document.getElementById('formConsultaDetran').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Pega a placa digitada e tira espaços em branco
    const placaInput = document.getElementById('placaConsulta').value.toUpperCase().trim();
    const btn = e.target.querySelector('button');
    const resultadoBox = document.getElementById('resultadoConsulta');
    const dadosTbody = document.getElementById('dadosRetornados');

    // Efeito de carregamento no botão
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner-gap anim-spin"></i> Consultando base de dados...';

    try {
        // Vai no backend buscar todos os veículos deste despachante
        const res = await fetch(`${API}/veiculos`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Falha ao buscar veículos');

        const veiculos = await res.json();

        // Procura no array se existe algum carro com a placa digitada
        const veiculoEncontrado = veiculos.find(v => v.placa.toUpperCase() === placaInput);

        // Simulamos 1 segundo de "processamento" para dar sensação de consulta real
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-magnifying-glass"></i> Realizar Consulta Agora';
            
            resultadoBox.style.display = 'block';
            
            if (veiculoEncontrado) {
                // Se achou, preenche a tabela com os dados REAIS do seu banco de dados
                dadosTbody.innerHTML = `
                    <tr><td><strong>PLACA</strong></td><td>${veiculoEncontrado.placa}</td></tr>
                    <tr><td><strong>RENAVAM</strong></td><td>${veiculoEncontrado.renavam || '--'}</td></tr>
                    <tr><td><strong>CHASSI</strong></td><td>${veiculoEncontrado.chassi || '--'}</td></tr>
                    <tr><td><strong>MARCA/MODELO</strong></td><td>${veiculoEncontrado.marca || '--'} / ${veiculoEncontrado.modelo || '--'}</td></tr>
                    <tr><td><strong>ANO FABRICAÇÃO</strong></td><td>${veiculoEncontrado.ano_fabricacao || '--'}</td></tr>
                    <tr><td><strong>ANO MODELO</strong></td><td>${veiculoEncontrado.ano_modelo || '--'}</td></tr>
                    <tr><td><strong>SITUAÇÃO (Simulada)</strong></td><td><span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">REGULAR</span></td></tr>
                    <tr><td><strong>DÉBITOS (Simulado)</strong></td><td>R$ 0,00</td></tr>
                `;
            } else {
                // Se não achou a placa, mostra uma mensagem amigável de erro
                dadosTbody.innerHTML = `
                    <tr>
                        <td colspan="2" style="text-align: center; color: #ef4444; padding: 30px;">
                            <i class="ph ph-warning-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                            Veículo com a placa <strong>${placaInput}</strong> não encontrado na sua base de dados local.
                        </td>
                    </tr>
                `;
            }
        }, 1000);

    } catch (error) {
        console.error('Erro na consulta:', error);
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-magnifying-glass"></i> Realizar Consulta Agora';
        alert('Erro ao tentar comunicar com o banco de dados.');
    }
});