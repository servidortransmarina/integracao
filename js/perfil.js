/* Editar perfil: avatar, senha e e-mail (com código de confirmação). Vale para todos os perfis. */
const AVATARES = ['🙂', '😎', '🧑‍🔧', '🧑‍💼', '🚛', '🦊', '🐯', '🦁', '🐺', '🦅', '⚓', '🏁'];
const Perfil = {
  abrir() {
    const S = App.sessao, corpo = h('div'), abas = h('div', { class: 'tabs-in' }), area = h('div');
    const pain = {
      conta: () => {
        const cx = h('div', { class: 'row', style: 'margin-bottom:12px' }), msg = h('div', { class: 'msg' });
        AVATARES.forEach(a => cx.append(h('button', { class: 'perfil-icone', type: 'button', text: a, style: a === S.avatar ? 'border-color:var(--primary)' : '', onclick: async () => {
          try { await API.chamar('atualizarDados', { avatar: a }); S.avatar = a; App.montarUsuario(); toast('Foto atualizada.'); mostrar('conta'); } catch (e) { mensagem(msg, e.message); } } })));
        return h('div', {}, h('dl', { class: 'dl' }, h('dt', { text: 'Nome' }), h('dd', { text: S.nome }), h('dt', { text: 'Usuário' }), h('dd', { text: S.usuario }), h('dt', { text: 'E-mail' }), h('dd', { text: S.email || '—' }), h('dt', { text: 'Perfil' }), h('dd', { text: NOME_PERFIL[S.perfil] })),
          h('h2', { style: 'margin:18px 0 8px;font-size:14px', text: 'Foto de perfil' }), cx, msg);
      },
      senha: () => {
        const a = h('input', { type: 'password', autocomplete: 'current-password' }), n = h('input', { type: 'password', autocomplete: 'new-password' }), n2 = h('input', { type: 'password', autocomplete: 'new-password' });
        const m = h('div', { class: 'msg' }), b = h('button', { class: 'btn', type: 'submit', text: 'Trocar senha' });
        return h('form', { onsubmit: async e => { e.preventDefault(); if (n.value !== n2.value) return mensagem(m, 'As senhas não conferem.'); b.disabled = true;
          try { await API.chamar('alterarSenha', { senhaAtual: a.value, novaSenha: n.value }); mensagem(m, 'Senha alterada. Outros aparelhos foram desconectados.', 'ok'); a.value = n.value = n2.value = ''; } catch (err) { mensagem(m, err.message); } b.disabled = false; } },
          campo('Senha atual', a), campo('Nova senha', n), h('div', { class: 'regras', text: REGRA_SENHA }), campo('Repita a nova senha', n2), m, b);
      },
      email: () => {
        const novo = h('input', { type: 'email', autocapitalize: 'none' }), senha = h('input', { type: 'password', autocomplete: 'current-password' }), cod = h('input', { type: 'text', inputmode: 'numeric', maxlength: '6' });
        const m = h('div', { class: 'msg' }), p2 = h('div', { hidden: true }), bEnv = h('button', { class: 'btn', type: 'button', text: 'Enviar código' }), bOk = h('button', { class: 'btn', type: 'submit', text: 'Confirmar novo e-mail' });
        bEnv.onclick = async () => { bEnv.disabled = true; try { await API.chamar('solicitarTrocaEmail', { novoEmail: novo.value.trim(), senhaAtual: senha.value }); p2.hidden = false; mensagem(m, 'Se o e-mail puder ser usado, enviamos um código.', 'ok'); } catch (err) { mensagem(m, err.message); } bEnv.disabled = false; };
        p2.append(campo('Código recebido no novo e-mail', cod), bOk);
        return h('form', { onsubmit: async e => { e.preventDefault(); bOk.disabled = true;
          try { await API.chamar('confirmarTrocaEmail', { novoEmail: novo.value.trim(), codigo: cod.value.trim() }); S.email = novo.value.trim(); toast('E-mail atualizado.'); mostrar('conta'); } catch (err) { mensagem(m, err.message); } bOk.disabled = false; } },
          campo('Novo e-mail', novo), campo('Sua senha atual', senha), bEnv, m, p2);
      }
    };
    const nomes = { conta: 'Conta', senha: 'Senha', email: 'E-mail' };
    const mostrar = n => { $$('button', abas).forEach(b => b.classList.toggle('active', b.dataset.t === n)); limpar(area).append(pain[n]()); };
    Object.keys(nomes).forEach(n => abas.append(h('button', { dataset: { t: n }, type: 'button', onclick: () => mostrar(n) }, nomes[n])));
    corpo.append(abas, area); mostrar('conta'); abrirModal('Editar perfil', corpo);
  }
};
