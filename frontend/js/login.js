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

// ...existing code do login...

// ...existing code...

function carregarPerfil() {
  const despachante = JSON.parse(localStorage.getItem('despachante') || 'null');
  if (!despachante) {
    window.location.href = 'login.html';
    return;
  }

  const nome = document.getElementById('perfilNome');
  const email = document.getElementById('perfilEmail');

  if (nome) nome.textContent = despachante.nome;
  if (email) email.textContent = despachante.email;
}

function togglePerfil(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('profileMenu');
  if (menu) {
    menu.classList.toggle('ativo');
  }
}

function sair() {
  localStorage.removeItem('token');
  localStorage.removeItem('despachante');
  window.location.href = 'login.html';
}

// Fechar menu ao clicar em outro lugar
document.addEventListener('click', (e) => {
  const menu = document.getElementById('profileMenu');
  const btn = document.querySelector('.profile-btn');
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.remove('ativo');
  }
});
}