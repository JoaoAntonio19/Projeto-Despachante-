async function verificarEmail() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const resultado = document.getElementById('resultado');

  if (!token) {
    resultado.textContent = 'Token de confirmação ausente.';
    resultado.className = 'mensagem erro';
    return;
  }

  try {
    const response = await fetch(`/api/auth/verificar-email?token=${token}`);
    const dados = await response.json();

    if (response.ok) {
      resultado.textContent = dados.mensagem || 'Email confirmado com sucesso.';
      resultado.className = 'mensagem sucesso';
    } else {
      resultado.textContent = dados.mensagem || 'Falha na confirmação.';
      resultado.className = 'mensagem erro';
    }
  } catch (error) {
    resultado.textContent = 'Erro de conexão.';
    resultado.className = 'mensagem erro';
  }
}

verificarEmail();