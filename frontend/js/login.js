async function fazerLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  const erro = document.getElementById('mensagemErro');

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', { // Adicionei a URL completa igual aos outros arquivos por segurança
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


function carregarPerfil() {
  const despachante = JSON.parse(localStorage.getItem('despachante') || 'null');
  
  // Se estiver na página de login, não precisa redirecionar
  if (!despachante && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
    return;
  }

  const nome = document.getElementById('perfilNome');
  const email = document.getElementById('perfilEmail');

  if (nome) nome.textContent = despachante ? despachante.nome : 'Usuário';
  if (email) email.textContent = despachante ? despachante.email : '';
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

document.addEventListener('click', (e) => {
  const menu = document.getElementById('profileMenu');
  const btn = document.querySelector('.profile-btn');
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.remove('ativo');
  }
});

function configurarOlhinho(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input || !btn) return;

  const mostrar = () => input.type = 'text';
  const esconder = () => input.type = 'password';

  btn.addEventListener('mousedown', mostrar);
  btn.addEventListener('mouseup', esconder);
  btn.addEventListener('mouseleave', esconder); // Se arrastar o mouse pra fora do botão, esconde!

  btn.addEventListener('touchstart', (e) => { e.preventDefault(); mostrar(); });
  btn.addEventListener('touchend', esconder);
  btn.addEventListener('touchcancel', esconder);
}

document.addEventListener('DOMContentLoaded', () => {
  configurarOlhinho('senha', 'btnOlhoSenha');
  // Se estiver na tela de cadastro, também ativa o segundo campo
  configurarOlhinho('confirmaSenha', 'btnOlhoConfirma'); 
});