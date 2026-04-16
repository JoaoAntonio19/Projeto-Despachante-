async function fazerLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  const erro = document.getElementById('mensagemErro');

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    const dados = await response.json();

    if (response.ok) {
      localStorage.setItem('token', dados.token);
      localStorage.setItem('despachante', JSON.stringify(dados.despachante));
      window.location.href = 'index.html';
    } else {
      erro.textContent = dados.mensagem || 'Erro ao fazer login';
      erro.style.display = 'block';
    }
  } catch (error) {
    erro.textContent = 'Erro de conexão';
    erro.style.display = 'block';
  }
}