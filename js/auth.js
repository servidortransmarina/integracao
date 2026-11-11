/* Telas de acesso: entrar, criar conta (e-mail → código → dados), recuperar senha. */
const Auth = {
  telas: {},
  mostrar(nome) { const raiz = limpar($('#authBox')); raiz.append(this.telas[nome]()); const i = $('input', raiz); if (i && window.innerWidth > 820) i.focus(); },

  cartao(titulo, sub, ...filhos) {
    return h('div', { class: 'auth-card' },
      h('div', { class: 'brand' }, h('img', { src: 'logotrm.png', alt: 'Transmarina', onerror: function () { this.replaceWith(h('div', { class: 'logo-txt', text: 'TRANSMARINA' })); } })),
      h('h1', { text: titulo }), h('p', { class: 'sub', text: sub }), ...filhos);
  }
};

Auth.telas.entrar = () => {
  const u = h('input', { type: 'text', autocomplete: 'username', autocapitalize: 'none', placeholder: 'Joao.123456 ou e-mail' });
  const s = h('input', { type: 'password', autocomplete: 'current-password' });
  const m = h('div', { class: 'msg' }), b = h('button', { class: 'btn block', type: 'submit', text: 'Entrar' });
  const f = h('form', { onsubmit: async e => {
    e.preventDefault(); mensagem(m, ''); b.disabled = true; b.textContent = 'Entrando…';
    try { const r = await API.chamar('login', { usuario: u.value.trim(), senha: s.value }, { semExpirar: true }); s.value = ''; await App.iniciar(r); }
    catch (err) { mensagem(m, err.message); }
    b.disabled = false; b.textContent = 'Entrar';
  } }, campo('Usuário ou e-mail', u), campo('Senha', s), m, b,
    h('div', { class: 'auth-links' }, h('button', { class: 'link', type: 'button', text: 'Criar conta', onclick: () => Auth.mostrar('cadastro') }),
      h('button', { class: 'link', type: 'button', text: 'Esqueci a senha / primeiro acesso', onclick: () => Auth.mostrar('recuperar') })));
  return Auth.cartao('Entrar', 'Um só acesso para todos os sistemas', f);
};

Auth.telas.cadastro = () => {
  const email = h('input', { type: 'email', autocomplete: 'email', autocapitalize: 'none' });
  const cod = h('input', { type: 'text', inputmode: 'numeric', maxlength: '6', autocomplete: 'one-time-code', placeholder: '000000' });
  const nome = h('input', { type: 'text', autocomplete: 'name' });
  const cpf = h('input', { type: 'text', inputmode: 'numeric', maxlength: '14', placeholder: '000.000.000-00' });
  const s1 = h('input', { type: 'password', autocomplete: 'new-password' }), s2 = h('input', { type: 'password', autocomplete: 'new-password' });
  const m = h('div', { class: 'msg' }), passo2 = h('div', { hidden: true });
  const bEnviar = h('button', { class: 'btn block', type: 'button', text: 'Enviar código por e-mail' });
  const bFim = h('button', { class: 'btn block', type: 'submit', text: 'Solicitar cadastro' });
  bEnviar.onclick = async () => {
    mensagem(m, ''); bEnviar.disabled = true;
    try { await API.chamar('solicitarCodigoCadastro', { email: email.value.trim() }, { semExpirar: true }); passo2.hidden = false; email.readOnly = true;
      mensagem(m, 'Se o e-mail puder ser usado, enviamos um código (vale 10 minutos).', 'ok'); cod.focus(); }
    catch (err) { mensagem(m, err.message); }
    bEnviar.disabled = false;
  };
  passo2.append(campo('Código recebido', cod), campo('Nome completo', nome), campo('CPF', cpf, 'Usado só para confirmar sua identidade; guardamos apenas um código irreversível.'),
    campo('Senha', s1), h('div', { class: 'regras', text: REGRA_SENHA }), campo('Repita a senha', s2), bFim);
  const f = h('form', { onsubmit: async e => {
    e.preventDefault(); mensagem(m, '');
    if (s1.value !== s2.value) return mensagem(m, 'As senhas não conferem.');
    bFim.disabled = true;
    try { const r = await API.chamar('concluirCadastro', { email: email.value.trim(), codigo: cod.value.trim(), nome: nome.value.trim(), cpf: cpf.value, senha: s1.value }, { semExpirar: true });
      Auth._usuarioNovo = r.usuario; Auth.mostrar('cadastroOk'); }
    catch (err) { mensagem(m, err.message); }
    bFim.disabled = false;
  } }, campo('E-mail', email), bEnviar, m, passo2,
    h('div', { class: 'auth-links' }, h('button', { class: 'link', type: 'button', text: '← Voltar ao login', onclick: () => Auth.mostrar('entrar') })));
  return Auth.cartao('Criar conta', 'O administrador aprova seu acesso', f);
};

Auth.telas.cadastroOk = () => Auth.cartao('Cadastro enviado', 'Aguarde a aprovação do administrador',
  h('p', { text: 'Seu usuário de acesso é:' }), h('p', { style: 'font-size:22px;font-weight:700;text-align:center;margin:8px 0 14px', text: Auth._usuarioNovo || '' }),
  h('p', { class: 'hint', text: 'Anote este usuário. Você também pode entrar com o e-mail cadastrado. Quando for aprovado, entre com a senha que criou.' }),
  h('button', { class: 'btn block', text: 'Ir para o login', onclick: () => Auth.mostrar('entrar') }));

Auth.telas.recuperar = () => {
  const email = h('input', { type: 'email', autocomplete: 'email', autocapitalize: 'none' });
  const cod = h('input', { type: 'text', inputmode: 'numeric', maxlength: '6', autocomplete: 'one-time-code' });
  const s1 = h('input', { type: 'password', autocomplete: 'new-password' }), s2 = h('input', { type: 'password', autocomplete: 'new-password' });
  const m = h('div', { class: 'msg' }), passo2 = h('div', { hidden: true });
  const bEnviar = h('button', { class: 'btn block', type: 'button', text: 'Enviar código por e-mail' });
  const bFim = h('button', { class: 'btn block', type: 'submit', text: 'Definir nova senha' });
  bEnviar.onclick = async () => {
    mensagem(m, ''); bEnviar.disabled = true;
    try { await API.chamar('solicitarRecuperacao', { email: email.value.trim() }, { semExpirar: true }); passo2.hidden = false; email.readOnly = true;
      mensagem(m, 'Se houver uma conta com esse e-mail, enviamos um código (vale 10 minutos).', 'ok'); cod.focus(); }
    catch (err) { mensagem(m, err.message); }
    bEnviar.disabled = false;
  };
  passo2.append(campo('Código recebido', cod), campo('Nova senha', s1), h('div', { class: 'regras', text: REGRA_SENHA }), campo('Repita a senha', s2), bFim);
  const f = h('form', { onsubmit: async e => {
    e.preventDefault(); mensagem(m, '');
    if (s1.value !== s2.value) return mensagem(m, 'As senhas não conferem.');
    bFim.disabled = true;
    try { await API.chamar('redefinirSenha', { email: email.value.trim(), codigo: cod.value.trim(), senha: s1.value }, { semExpirar: true }); toast('Senha definida. Faça login.'); Auth.mostrar('entrar'); }
    catch (err) { mensagem(m, err.message); }
    bFim.disabled = false;
  } }, campo('E-mail da conta', email), bEnviar, m, passo2,
    h('div', { class: 'auth-links' }, h('button', { class: 'link', type: 'button', text: '← Voltar ao login', onclick: () => Auth.mostrar('entrar') })));
  return Auth.cartao('Recuperar acesso', 'Também serve para o primeiro acesso de quem foi convidado', f);
};

/** Troca obrigatória de senha (contas migradas). Bloqueia o app até concluir. */
function exigirTrocaSenha(aoConcluir) {
  const a = h('input', { type: 'password', autocomplete: 'current-password' }), n = h('input', { type: 'password', autocomplete: 'new-password' }), n2 = h('input', { type: 'password', autocomplete: 'new-password' });
  const m = h('div', { class: 'msg' }), b = h('button', { class: 'btn', type: 'submit', text: 'Salvar nova senha' });
  const f = h('form', { onsubmit: async e => {
    e.preventDefault(); mensagem(m, ''); if (n.value !== n2.value) return mensagem(m, 'As senhas não conferem.');
    b.disabled = true;
    try { await API.chamar('alterarSenha', { senhaAtual: a.value, novaSenha: n.value }); modal.fechar(); toast('Senha atualizada.'); aoConcluir(); }
    catch (err) { mensagem(m, err.message); }
    b.disabled = false;
  } }, h('p', { class: 'hint', text: 'Por segurança, defina uma nova senha antes de continuar.' }), campo('Senha atual', a), campo('Nova senha', n), h('div', { class: 'regras', text: REGRA_SENHA }), campo('Repita a nova senha', n2), m,
    h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary', type: 'button', text: 'Sair', onclick: () => App.sair() }), b));
  const modal = abrirModal('Troque sua senha', f, { fixo: true, centro: true });
}
