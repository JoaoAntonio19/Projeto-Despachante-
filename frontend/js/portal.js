const API = 'http://localhost:3000/api';
let tokenAtual = '';

async function inicializar() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    document.getElementById('telaInvalida').style.display = 'flex';
    return;
  }

  tokenAtual = token;

  try {
    const res = await fetch(`${API}/portal/solicitacao/${token}`);
    if (!res.ok) throw new Error('Token inválido');
    const dados = await res.json();

    if (dados.status === 'concluido') {
      document.getElementById('telaSucesso').style.display = 'flex';
      return;
    }

    document.getElementById('telaFormulario').style.display = 'block';
  } catch (err) {
    document.getElementById('telaInvalida').style.display = 'flex';
  }
}

async function buscarCEP() {
  const cep = document.getElementById('cep').value.replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dados = await res.json();
    if (!dados.erro) {
      document.getElementById('endereco').value = `${dados.logradouro}, ${dados.bairro}`;
      document.getElementById('cidade').value = dados.localidade;
      document.getElementById('estado').value = dados.uf;
    }
  } catch (err) {
    console.error('Erro ao buscar CEP:', err);
  }
}

async function enviarDados() {
  const nome = document.getElementById('nome').value;
  const cpf = document.getElementById('cpf').value;
  const telefone = document.getElementById('telefone').value;

  if (!nome || !cpf || !telefone) {
    alert('Por favor preencha nome, CPF e telefone.');
    return;
  }

  const formData = new FormData();
  formData.append('nome', nome);
  formData.append('cpf', cpf);
  formData.append('telefone', telefone);
  formData.append('email', document.getElementById('email').value);
  formData.append('cep', document.getElementById('cep').value);
  formData.append('endereco', document.getElementById('endereco').value);
  formData.append('cidade', document.getElementById('cidade').value);
  formData.append('estado', document.getElementById('estado').value);
  formData.append('placa', document.getElementById('placa').value);
  formData.append('renavam', document.getElementById('renavam').value);
  formData.append('chassi', document.getElementById('chassi').value);
  formData.append('marca', document.getElementById('marca').value);
  formData.append('modelo', document.getElementById('modelo').value);
  formData.append('ano_modelo', document.getElementById('ano_modelo').value);
  formData.append('ano_fabricacao', document.getElementById('ano_fabricacao').value);
  formData.append('combustivel', document.getElementById('combustivel').value);
  formData.append('categoria', document.getElementById('categoria').value);

  const cnh = document.getElementById('cnh').files[0];
  const comprovante = document.getElementById('comprovante').files[0];
  const crv = document.getElementById('crv').files[0];
  if (cnh) formData.append('cnh', cnh);
  if (comprovante) formData.append('comprovante', comprovante);
  if (crv) formData.append('crv', crv);
  const fotoFrente = document.getElementById('fotoFrente').files[0];
  if (fotoFrente) formData.append('fotoFrente', fotoFrente);
  const fotoTraseira = document.getElementById('fotoTraseira').files[0];
  if (fotoTraseira) formData.append('fotoTraseira', fotoTraseira);
  const fotoLateral = document.getElementById('fotoLateral').files[0];
  if (fotoLateral) formData.append('fotoLateral', fotoLateral);
  const fotoPainel = document.getElementById('fotoPainel').files[0];
  if (fotoPainel) formData.append('fotoPainel', fotoPainel);

  const fotosExtras = document.getElementById('fotosExtras').files;
  if (fotosExtras.length > 0) {
    for (let i = 0; i < fotosExtras.length; i++) {
        formData.append('fotosExtras', fotosExtras[i]);
    }
}

  try {
    const btn = document.querySelector('.btn-enviar');
    btn.textContent = 'Enviando...';
    btn.disabled = true;

    const res = await fetch(`${API}/portal/enviar/${tokenAtual}`, {
      method: 'POST',
      body: formData,
    });

    const resultado = await res.json();
    if (resultado.sucesso) {
      document.getElementById('telaFormulario').style.display = 'none';
      document.getElementById('telaSucesso').style.display = 'flex';
    } else {
      alert('Erro ao enviar: ' + resultado.erro);
      btn.textContent = 'Enviar Dados';
      btn.disabled = false;
    }
  } catch (err) {
    alert('Erro ao enviar dados. Tente novamente.');
    console.error(err);
  }
}

inicializar();