/* Gestão de usuários — só master (o servidor também confere). */
const Usuarios = {
  async contarPendentes() {
    try { const r = await API.chamar('listarUsuarios'); const n = r.usuarios.filter(u => u.status === 'PENDENTE_APROVACAO').length, b = $('#badgeUsuarios');
      if (b) { b.hidden = !n; b.textContent = n; } $('#perfilBadge').hidden = !n; $('#perfilBadge').textContent = n; } catch (e) {}
  },
  async abrir() {
    const caixa = h('div', {}, h('div', { class: 'empty', text: 'Carregando…' })); const mod = abrirModal('Usuários', caixa, { largo: true });
    const desenhar = async () => {
      let r; try { r = await API.chamar('listarUsuarios'); } catch (e) { return mensagem(limpar(caixa).appendChild(h('div', { class: 'msg' })), e.message); }
      limpar(caixa);
      const pend = r.usuarios.filter(u => u.status === 'PENDENTE_APROVACAO'), outros = r.usuarios.filter(u => u.status !== 'PENDENTE_APROVACAO');
      if (pend.length) {
        caixa.append(h('h2', { style: 'font-size:15px', text: 'Aguardando aprovação (' + pend.length + ')' }));
        pend.forEach(u => {
          const sel = h('select', {}, ['motorista', 'mecanico', 'admin'].map(p => h('option', { value: p, selected: p === (u.perfilSugerido || 'motorista') ? true : null }, NOME_PERFIL[p])));
          caixa.append(h('div', { class: 'card', style: 'padding:14px' }, h('b', { text: u.nome }), h('div', { class: 'hint', text: u.usuario + ' · ' + u.email + ' · CPF ' + (u.cpf || '—') }),
            h('div', {}, u.identidade === 'VERIFICADA' ? h('span', { class: 'badge green', text: 'CPF confere com cadastro' }) : u.identidade === 'DIVERGENTE' ? h('span', { class: 'badge red', text: 'CPF diverge do cadastro' }) : h('span', { class: 'badge gray', text: 'Sem cadastro para conferir' })),
            h('div', { class: 'row', style: 'margin-top:10px' }, h('div', { class: 'field', style: 'margin:0' }, sel),
              h('button', { class: 'btn small success', text: 'Aprovar', onclick: () => this.agir(() => API.chamar('decidirCadastro', { usuario: u.usuario, aprovar: true, perfil: sel.value }), desenhar) }),
              h('button', { class: 'btn small danger', text: 'Recusar', onclick: () => confirm('Recusar o cadastro de ' + u.nome + '?') && this.agir(() => API.chamar('decidirCadastro', { usuario: u.usuario, aprovar: false }), desenhar) }))));
        });
      }
      caixa.append(h('h2', { style: 'font-size:15px;margin-top:8px', text: 'Todos os usuários' }));
      caixa.append(h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Usuário', 'Nome', 'Status', 'Perfil', ''].map(t => h('th', { text: t })))),
        h('tbody', {}, outros.map(u => {
          const ehMaster = u.perfil === 'master', sel = h('select', { disabled: ehMaster || u.usuario === App.sessao.usuario ? true : null }, ehMaster ? [h('option', {}, 'Master')] : ['motorista', 'mecanico', 'admin'].map(p => h('option', { value: p, selected: p === u.perfil ? true : null }, NOME_PERFIL[p])));
          if (!ehMaster) sel.onchange = () => this.agir(() => API.chamar('alterarPerfil', { usuario: u.usuario, perfil: sel.value }), desenhar);
          const cor = u.status === 'ATIVO' ? 'green' : u.status === 'INATIVO' || u.status === 'RECUSADO' ? 'red' : 'gray';
          const acao = ehMaster || u.usuario === App.sessao.usuario || ['ATIVO', 'INATIVO'].indexOf(u.status) < 0 ? '' :
            h('button', { class: 'btn small ' + (u.status === 'ATIVO' ? 'secondary' : 'success'), text: u.status === 'ATIVO' ? 'Desativar' : 'Ativar', onclick: () => this.agir(() => API.chamar('definirStatusUsuario', { usuario: u.usuario, status: u.status === 'ATIVO' ? 'INATIVO' : 'ATIVO' }), desenhar) });
          return h('tr', {}, h('td', { text: u.usuario }), h('td', { text: u.nome }), h('td', {}, h('span', { class: 'badge ' + cor, text: u.status })), h('td', {}, u.perfil ? sel : '—'), h('td', {}, acao));
        })))));
      this.contarPendentes();
    };
    desenhar();
  },
  async agir(fn, depois) { try { await fn(); toast('Feito.'); } catch (e) { toast(e.message, true); } depois(); }
};
