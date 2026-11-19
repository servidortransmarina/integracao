/* Gestão de usuários — só master (o servidor também confere). */
const Usuarios = {
  pendentes: 0,
  lista: [],
  atualizarContagem() { const n = this.lista.filter(u => u.status === 'PENDENTE_APROVACAO').length, b = $('#badgeUsuarios'); this.pendentes = n; if (b) { b.hidden = !n; b.textContent = n; } },
  async contarPendentes() { try { const r = await API.chamar('listarUsuarios'); this.lista = r.usuarios; this.atualizarContagem(); } catch (e) {} },
  async abrir() {
    const caixa = h('div', {}, h('div', { class: 'empty', text: 'Carregando…' })); const mod = abrirModal('Usuários', caixa, { largo: true });
    /** Redesenha na hora com a lista que já temos (sem esperar o servidor); só busca de novo quando pedido. */
    const desenhar = async (buscar = true) => {
      if (buscar) { try { const r = await API.chamar('listarUsuarios'); this.lista = r.usuarios; } catch (e) { return mensagem(limpar(caixa).appendChild(h('div', { class: 'msg' })), e.message); } }
      limpar(caixa); this.atualizarContagem();
      const pend = this.lista.filter(u => u.status === 'PENDENTE_APROVACAO'), outros = this.lista.filter(u => u.status !== 'PENDENTE_APROVACAO');
      this.redesenhar = () => desenhar(false);
      if (pend.length) {
        caixa.append(h('h2', { style: 'font-size:15px', text: 'Aguardando aprovação (' + pend.length + ')' }));
        pend.forEach(u => {
          const sel = h('select', {}, ['motorista', 'mecanico', 'admin', 'chefe'].map(p => h('option', { value: p, selected: p === (u.perfilSugerido || 'motorista') ? true : null }, NOME_PERFIL[p])));
          caixa.append(h('div', { class: 'card', style: 'padding:14px' }, h('b', { text: nomeBonito(u.nome) }), h('div', { class: 'hint', text: u.usuario + ' · ' + u.email + ' · CPF ' + (u.cpf || '—') }),
            h('div', {}, u.identidade === 'VERIFICADA' ? h('span', { class: 'badge green', text: 'CPF confere com cadastro' }) : u.identidade === 'DIVERGENTE' ? h('span', { class: 'badge red', text: 'CPF diverge do cadastro' }) : h('span', { class: 'badge gray', text: 'Sem cadastro para conferir' })),
            h('div', { class: 'row', style: 'margin-top:10px' }, h('div', { class: 'field', style: 'margin:0' }, sel),
              h('button', { class: 'btn small success', text: 'Aprovar', onclick: () => this.agir(() => API.chamar('decidirCadastro', { usuario: u.usuario, aprovar: true, perfil: sel.value }), () => { u.status = 'ATIVO'; u.perfil = sel.value; }) }),
              h('button', { class: 'btn small danger', text: 'Recusar', onclick: () => confirm('Recusar o cadastro de ' + u.nome + '?') && this.agir(() => API.chamar('decidirCadastro', { usuario: u.usuario, aprovar: false }), () => { u.status = 'RECUSADO'; }) }))));
        });
      }
      caixa.append(h('h2', { style: 'font-size:15px;margin-top:8px', text: 'Todos os usuários' }));
      caixa.append(h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Usuário', 'Nome', 'Status', 'Perfil', ''].map(t => h('th', { text: t })))),
        h('tbody', {}, outros.map(u => {
          const ehMaster = u.perfil === 'master', sel = h('select', { disabled: ehMaster || App.sessao.chefe || u.usuario === App.sessao.usuario ? true : null }, ehMaster ? [h('option', {}, 'Master')] : ['motorista', 'mecanico', 'admin', 'chefe'].map(p => h('option', { value: p, selected: p === u.perfil ? true : null }, NOME_PERFIL[p])));
          if (!ehMaster) sel.onchange = () => { const antes = u.perfil, novo = sel.value; this.agir(() => API.chamar('alterarPerfil', { usuario: u.usuario, perfil: novo }), () => { u.perfil = novo; }, () => { u.perfil = antes; }); };
          const cor = u.status === 'ATIVO' ? 'green' : u.status === 'INATIVO' || u.status === 'RECUSADO' ? 'red' : 'gray';
          const acao = ehMaster || u.usuario === App.sessao.usuario || ['ATIVO', 'INATIVO'].indexOf(u.status) < 0 ? '' :
            h('button', { class: 'btn small ' + (u.status === 'ATIVO' ? 'secondary' : 'success'), text: u.status === 'ATIVO' ? 'Desativar' : 'Ativar', onclick: () => { const antes = u.status, novo = antes === 'ATIVO' ? 'INATIVO' : 'ATIVO'; this.agir(() => API.chamar('definirStatusUsuario', { usuario: u.usuario, status: novo }), () => { u.status = novo; }, () => { u.status = antes; }); } });
          return h('tr', {}, h('td', { text: u.usuario }), h('td', {}, nomeBonito(u.nome), h('button', { class: 'link', type: 'button', title: 'Corrigir nome (acentos)', text: ' ✏️', onclick: () => { const n = prompt('Nome de exibição (com acentos):', u.nome); if (n && n.trim() && n.trim() !== u.nome) { const antes = u.nome, novo = n.trim(); this.agir(() => API.chamar('editarNomeUsuario', { usuario: u.usuario, nome: novo }), () => { u.nome = novo; }, () => { u.nome = antes; }); } } })), h('td', {}, h('span', { class: 'badge ' + cor, text: u.status })), h('td', {}, u.perfil ? sel : '—'), h('td', {}, h('div', { class: 'acoes-user' }, ehMaster || !u.perfil ? h('span') : h('button', { class: 'btn small secondary', type: 'button', text: '🔑 Sistemas', onclick: () => this.sistemas(u) }), acao || h('span'))));
        })))));
      if (typeof App !== 'undefined' && App.sessao) { App.montarUsuario(); App.montarNavegacao(); }
    };
    desenhar(true);
    this.desenharModal = desenhar;
  },
  /** Master escolhe quais sistemas a pessoa enxerga. */
  sistemas(u) {
    const lista = [['manutencao', '🔧 Manutenção'], ['fleet', '🚛 Fleet'], ['escalas', '📅 Escalas'], ['almoxarifado', '📦 Almoxarifado'], ['ponto', '🕒 Ponto'], ['financeiro', '💰 Financeiro']];
    const marcado = new Set(u.sistemas || []), caixa = h('div');
    lista.forEach(([id, nome]) => { const cb = h('input', { type: 'checkbox', checked: marcado.has(id) ? true : null, dataset: { sis: id } }); caixa.append(h('label', { class: 'pers-item' }, cb, h('span', { text: nome }))); });
    const selPonto = h('select', { class: 'sel-ponto' }, h('option', { value: 'adm', text: 'ADM do Ponto (tudo)' }), h('option', { value: 'encarregado', text: 'Encarregado (folgas e cartas pendentes)' }));
    selPonto.value = u.pontoPerfil || (u.perfil === 'admin' || u.perfil === 'master' ? 'adm' : 'encarregado');
    caixa.append(h('label', { class: 'pers-item ponto-perfil' }, h('span', { text: '🕒 Perfil dentro do Ponto: ' }), selPonto));
    const m = abrirModal('Sistemas de ' + nomeBonito(u.nome), h('div', {}, h('div', { class: 'hint', text: 'Marque o que esta pessoa pode ver. O que ela pode fazer dentro de cada sistema continua dependendo do perfil (' + (NOME_PERFIL[u.perfil] || u.perfil) + '). Ela entra de novo para valer.' }), caixa,
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary', text: 'Cancelar', onclick: () => m.fechar() }),
        h('button', { class: 'btn', text: 'Salvar', onclick: async () => { const mapa = {}; $$('input[data-sis]', caixa).forEach(cb => { mapa[cb.dataset.sis] = cb.checked; });
          try { await API.chamar('definirSistemasUsuario', { usuario: u.usuario, sistemas: mapa, perfisSis: { ponto: selPonto.value } }); u.pontoPerfil = selPonto.value; u.sistemas = Object.keys(mapa).filter(k => mapa[k]); toast('Sistemas atualizados.'); m.fechar(); } catch (e) { toast(e.message, true); } } }))));
  },
  /** Mostra o resultado na hora (otimista), manda ao servidor em segundo plano e desfaz se der erro. */
  agir(fn, aplicar, desfazer) {
    aplicar(); this.redesenhar && this.redesenhar();
    fn().then(() => toast('Feito.')).catch(e => { if (desfazer) desfazer(); toast(e.message, true); this.desenharModal && this.desenharModal(true); });
  }
};
