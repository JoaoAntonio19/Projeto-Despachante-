async function verificarEmail() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const resultado = document.getElementById('resultado');
  const statusTexto = document.getElementById('status-texto');

  if (!token) {
    statusTexto.style.display = 'none';
    resultado.textContent = 'Link de confirmação inválido ou ausente.';
    resultado.className = 'mensagem erro';
    return;
  }

  try {
    const response = await fetch(`/api/auth/verificar-email?token=${token}`);
    const dados = await response.json();

    statusTexto.style.display = 'none';

    if (response.ok) {
      resultado.innerHTML = `
        <strong>Sucesso!</strong><br>
        ${dados.mensagem || 'Seu e-mail foi confirmado com sucesso. Você já pode acessar o sistema.'}
        <p style="font-size: 12px; margin-top: 10px;">Redirecionando para o login em 3 segundos...</p>
      `;
      resultado.className = 'mensagem sucesso';

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 3000);

    } else {
      resultado.innerHTML = `
        <strong>Ops! Algo deu errado.</strong><br>
        ${dados.mensagem || 'Este link pode ter expirado ou já foi utilizado.'}
      `;
      resultado.className = 'mensagem erro';
    }
  } catch (error) {
    statusTexto.style.display = 'none';
    resultado.textContent = 'Erro de conexão com o servidor. Tente novamente mais tarde.';
    resultado.className = 'mensagem erro';
  }
}

document.addEventListener('DOMContentLoaded', verificarEmail);