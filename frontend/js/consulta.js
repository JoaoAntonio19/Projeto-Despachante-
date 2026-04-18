document.getElementById('formConsultaDetran').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const placa = document.getElementById('placaConsulta').value.toUpperCase();
    const btn = e.target.querySelector('button');
    const resultadoBox = document.getElementById('resultadoConsulta');
    const dadosTbody = document.getElementById('dadosRetornados');

    // Feedback visual de carregamento
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner-gap anim-spin"></i> Consultando base de dados...';

    // Simulação de busca na API (1.5 segundos)
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-magnifying-glass"></i> Realizar Consulta Agora';
        
        resultadoBox.style.display = 'block';
        
        // Inserindo os dados reais que você solicitou
        dadosTbody.innerHTML = `
            <tr><td><strong>PLACA</strong></td><td>${placa}</td></tr>
            <tr><td><strong>RENAVAM</strong></td><td>00462621677</td></tr>
            <tr><td><strong>CHASSI</strong></td><td>9BWAB45Z3K4007006</td></tr>
            <tr><td><strong>MARCA/MODELO</strong></td><td>HYUNDAI / HB20S</td></tr>
            <tr><td><strong>ANO FABRICAÇÃO</strong></td><td>2022</td></tr>
            <tr><td><strong>ANO MODELO</strong></td><td>2023</td></tr>
            <tr><td><strong>SITUAÇÃO</strong></td><td><span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">REGULAR</span></td></tr>
            <tr><td><strong>DÉBITOS TOTAL</strong></td><td>R$ 0,00</td></tr>
        `;
    }, 1000);
});