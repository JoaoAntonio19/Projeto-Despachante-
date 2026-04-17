document.getElementById('formCadastro').addEventListener('submit', fazerCadastro);

async function fazerCadastro(event) {
  event.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();
  const confirmarEmail = document.getElementById('confirmarEmail').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const senha = document.getElementById('senha').value;
  const confirmaSenha = document.getElementById('confirmaSenha').value;

  if (email !== confirmarEmail) {
    exibirMensagem('Os emails não conferem', 'erro');
    return;
  }

  if (senha !== confirmaSenha) {
    exibirMensagem('As senhas não correspondem', 'erro');
    return;
  }

  if (senha.length < 6) {
    exibirMensagem('A senha deve ter no mínimo 6 caracteres', 'erro');
    return;
  }

  try {
    const response = await fetch('/api/auth/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, confirmarEmail, telefone, senha })
    });

    const dados = await response.json();

    if (response.ok) {
  exibirMensagem('Cadastro feito. Verifique seu email para confirmar.', 'sucesso');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 500);


    } else {
      exibirMensagem(dados.mensagem || 'Erro ao cadastrar', 'erro');
    }
  } catch (error) {
    exibirMensagem('Erro de conexão: ' + error.message, 'erro');
  }
}

function exibirMensagem(texto, tipo) {
  const mensagem = document.getElementById('mensagem');
  mensagem.textContent = texto;
  mensagem.className = 'mensagem ' + tipo;
}

function alternarSenha(campoId) {
  const campo = document.getElementById(campoId);
  const icone = campoId === 'senha'
    ? document.getElementById('iconeSenha1')
    : document.getElementById('iconeSenha2');

  if (!campo) return;

  const mostrar = campo.type === 'password';
  campo.type = mostrar ? 'text' : 'password';
  if (icone) icone.textContent = mostrar ? '🙈' : '👁️';
}

// --- LÓGICA DO OLHINHO DE SENHA (PRESS & HOLD) ---
function configurarOlhinho(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input || !btn) return;

  const mostrar = () => input.type = 'text';
  const esconder = () => input.type = 'password';

  // Para Computador (Mouse)
  btn.addEventListener('mousedown', mostrar);
  btn.addEventListener('mouseup', esconder);
  btn.addEventListener('mouseleave', esconder); // Se arrastar o mouse pra fora do botão, esconde!

  // Para Celular (Toque)
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); mostrar(); });
  btn.addEventListener('touchend', esconder);
  btn.addEventListener('touchcancel', esconder);
}

// Ativa a função quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
  configurarOlhinho('senha', 'btnOlhoSenha');
  // Se estiver na tela de cadastro, também ativa o segundo campo
  configurarOlhinho('confirmaSenha', 'btnOlhoConfirma'); 
});