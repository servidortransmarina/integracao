/* Hub: barra lateral (PC), barra inferior (celular), páginas por perfil. As telas de Frota são o GF (js/gf). */
const TODOS_P = ['master', 'admin', 'mecanico', 'motorista'], GESTAO_P = ['master', 'admin'], OFICINA_P = ['master', 'admin', 'mecanico'];
const SISTEMAS = [
  { nome: 'Sistemas', itens: ['frota', 'alertas', 'dashboard', 'pneus', 'checklists', 'abastecimento', 'podio'] },
  { nome: 'Em breve', itens: ['ponto', 'financeiro'] },
  { nome: 'Administração', itens: ['usuarios'] }
];
const ABAS = [
  { id: 'inicio', nome: 'Início', ic: '🏠', perfis: TODOS_P },
  { id: 'frota', nome: 'Frota', ic: '🚛', perfis: OFICINA_P, gf: 'manutencao' },
  { id: 'alertas', nome: 'Alertas', ic: '🔔', perfis: OFICINA_P, gf: 'alertas', contador: () => Hub.contarAtencao() },
  { id: 'dashboard', nome: 'Dashboard', ic: '📊', perfis: GESTAO_P, gf: 'dashboard' },
  { id: 'pneus', nome: 'Pneus', ic: '🛞', perfis: GESTAO_P, gf: 'pneus' },
  { id: 'checklists', nome: 'Checklists', ic: '✅', perfis: ['master', 'admin', 'motorista'], soon: 'Fase 4 — checklist com fotos e avaliação.' },
  { id: 'abastecimento', nome: 'Abastecer', ic: '⛽', perfis: ['motorista'], soon: 'Fase 5 — lançar abastecimento e ganhar pontos.' },
  { id: 'podio', nome: 'Pódio', ic: '🏆', perfis: GESTAO_P, soon: 'Fase 6 — ranking dos motoristas com setas de subida e descida.' },
  { id: 'ponto', nome: 'Ponto', ic: '🕒', perfis: GESTAO_P, futuro: true },
  { id: 'financeiro', nome: 'Financeiro', ic: '💰', perfis: ['master'], futuro: true },
  { id: 'usuarios', nome: 'Usuários', ic: '👥', perfis: ['master'], acao: () => Usuarios.abrir(), contador: () => Usuarios.pendentes || 0 }
];

const Hub = {
  ir(id) { App.abrirAba(id); },
  /** Chamado sempre que App.dados muda: prepara o db do GF e sincroniza alertas automáticos. */
  aposDados() {
    if (App.sessao.perfil === 'motorista') return;
    db = normalizarDadosDaPlanilha(limparTextoGF(App.dados));
    db.veiculos.forEach(v => garantirLimites(v.placa));
    try { sincronizarAlertas(true); } catch (e) { console.error(e); }
  },
  contarAtencao() { try { return db.alertas.filter(a => a.status !== 'resolvido' && grupoAlerta(a) === 'atrasado').length; } catch (e) { return 0; } }
};

const App = {
  sessao: null, dados: null, aba: 'inicio',

  async iniciar(login) {
    if (login.token) API.guardar(login.token);
    const me = await API.chamar('me');
    this.sessao = { usuario: me.usuario, nome: me.nome, email: me.email, avatar: me.avatar || '🙂', perfil: (me.acessos && me.acessos.frota) || '', acessos: me.acessos };
    if (!this.sessao.perfil) { API.guardar(''); throw new Error('Sua conta ainda não tem acesso a nenhum sistema.'); }
    $('#auth').hidden = true; $('#app').hidden = false;
    this.montarUsuario(); this.montarNavegacao();
    if (login.trocarSenha) { exigirTrocaSenha(() => this.recarregar()); return; }
    await this.recarregar();
  },

  async recarregar(silencioso) {
    if (!silencioso) setLoading(true);
    try { this.dados = await API.chamar('getBootstrap'); } catch (e) { setLoading(false); if (!silencioso) toast(e.message, true); return; }
    setLoading(false);
    this.sessao.perfil = this.dados.perfil || this.sessao.perfil;
    Hub.aposDados(); this.montarUsuario(); this.montarNavegacao();
    if (this.sessao.perfil === 'master') await Usuarios.contarPendentes();
    this.abrirAba(this.abaValida(this.aba));
  },

  abasDoPerfil() { return ABAS.filter(a => a.perfis.indexOf(this.sessao.perfil) >= 0); },
  abaValida(id) { const a = this.abasDoPerfil().find(x => x.id === id); return a && !a.acao && !a.futuro ? id : 'inicio'; },

  /* ---- usuário / menu ---- */
  montarUsuario() {
    const S = this.sessao, pend = S.perfil === 'master' ? (Usuarios.pendentes || 0) : 0;
    const av = () => { const e = h('span', { class: 'avatar', text: S.avatar || '🙂' }); if (pend) e.append(h('span', { class: 'dot', text: String(pend) })); return e; };
    const su = limpar($('#sideUser')); su.append(av(), h('div', {}, h('div', { class: 'nm', text: S.nome }), h('small', { text: NOME_PERFIL[S.perfil] || '' })));
    su.onclick = e => { e.stopPropagation(); this.menuPerfil(su, true); };
    const tu = limpar($('#topUser')); tu.append(S.avatar || '🙂'); if (pend) tu.append(h('span', { class: 'dot', text: String(pend) }));
    tu.onclick = e => { e.stopPropagation(); this.menuPerfil(tu, false); };
  },
  menuPerfil(ancora, paraCima) {
    const antigo = $('#perfilPop'); if (antigo) { antigo.remove(); return; }
    const S = this.sessao, pop = h('div', { class: 'pop', id: 'perfilPop' }, h('div', { class: 'nome' }, S.nome, h('small', { text: NOME_PERFIL[S.perfil] })), h('hr'),
      h('button', { onclick: () => { pop.remove(); Perfil.abrir(); } }, '✏️ Editar perfil'));
    if (S.perfil === 'master') pop.append(h('button', { onclick: () => { pop.remove(); Usuarios.abrir(); } }, '👥 Usuários', Usuarios.pendentes ? h('span', { class: 'badge red', text: String(Usuarios.pendentes) }) : null));
    pop.append(h('hr'), h('button', { onclick: () => { pop.remove(); this.sair(); } }, '🚪 Sair do sistema'));
    document.body.append(pop);
    const r = ancora.getBoundingClientRect(), w = pop.offsetWidth, hh = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, paraCima ? r.left : r.right - w)) + 'px';
    pop.style.top = (paraCima ? Math.max(8, r.top - hh - 8) : r.bottom + 8) + 'px';
  },

  /* ---- navegação ---- */
  chaveBarra() { return 'trm.barra.' + this.sessao.usuario; },
  abasDaBarra() {
    const todas = this.abasDoPerfil().filter(a => !a.futuro).map(a => a.id); let esc = [];
    try { esc = JSON.parse(localStorage.getItem(this.chaveBarra()) || '[]'); } catch (e) {}
    esc = esc.filter(id => todas.indexOf(id) >= 0).slice(0, 4);
    if (!esc.length) esc = todas.slice(0, todas.length > 5 ? 4 : 5);
    return esc;
  },
  badge(a) { try { return a.contador ? a.contador() : 0; } catch (e) { return 0; } },
  montarNavegacao() {
    const lado = limpar($('#sideNav')), abas = this.abasDoPerfil();
    const item = a => { const n = this.badge(a);
      return h('button', { class: 'side-item' + (a.futuro ? ' futuro' : '') + (a.id === this.aba ? ' active' : ''), dataset: { aba: a.id }, onclick: a.futuro ? null : () => this.abrirAba(a.id) },
        h('span', { class: 'ic', text: a.ic }), a.nome, n ? h('span', { class: 'n', text: String(n) }) : null, a.futuro ? h('span', { class: 'tag', text: 'em breve' }) : null); };
    const inicio = abas.find(a => a.id === 'inicio'); lado.append(item(inicio));
    SISTEMAS.forEach(g => { const its = g.itens.map(id => abas.find(a => a.id === id)).filter(Boolean); if (!its.length) return; lado.append(h('div', { class: 'side-sec', text: g.nome }), ...its.map(item)); });
    const barra = limpar($('#bottombar')), usaveis = abas.filter(a => !a.futuro);
    const naBarra = usaveis.length > 5 ? this.abasDaBarra() : usaveis.map(a => a.id);
    naBarra.forEach(id => { const a = usaveis.find(x => x.id === id), n = this.badge(a);
      barra.append(h('button', { dataset: { aba: id }, class: id === this.aba ? 'active' : '', onclick: () => this.abrirAba(id) }, h('span', { class: 'ic', text: a.ic }), a.nome, n ? h('span', { class: 'n', text: String(n) }) : null)); });
    if (usaveis.length > 5) barra.append(h('button', { onclick: () => this.abrirMais() }, h('span', { class: 'ic', text: '⋯' }), 'Mais'));
  },

  abrirAba(id) {
    const a = ABAS.find(x => x.id === id); if (!a) return;
    if (a.acao) { a.acao(); return; }
    if (a.futuro) return;
    this.aba = id;
    $$('[data-aba]').forEach(b => b.classList.toggle('active', b.dataset.aba === id));
    $('#tituloTopo').textContent = a.nome;
    const hubC = limpar($('#hubConteudo')), gfR = $('#gfRoot');
    $('#btnImprimir').hidden = !(a.gf && OFICINA_P.indexOf(this.sessao.perfil) >= 0);
    $('#btnAtualizar').hidden = false;
    if (a.gf) {
      hubC.hidden = true; gfR.hidden = false;
      $$('#gfRoot > .tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + a.gf));
      gfAba = a.gf; renderTelaAtual();
    } else {
      gfR.hidden = true; hubC.hidden = false;
      if (a.soon) hubC.append(h('div', { class: 'card soon' }, h('b', { text: a.nome }), 'Em construção. ' + a.soon));
      else hubC.append(Inicio.render());
    }
    window.scrollTo(0, 0);
  },
  abrirMais() {
    const abas = this.abasDoPerfil().filter(a => !a.futuro), lista = h('div', { class: 'mais-list' });
    abas.forEach(a => lista.append(h('button', { onclick: () => { m.fechar(); this.abrirAba(a.id); } }, h('span', { class: 'ic', text: a.ic }), a.nome)));
    const m = abrirModal('Menu', h('div', {}, lista, h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary small', text: 'Personalizar barra', onclick: () => { m.fechar(); this.personalizar(); } }))));
  },
  personalizar() {
    const abas = this.abasDoPerfil().filter(a => !a.futuro), sel = new Set(this.abasDaBarra()), caixa = h('div');
    abas.forEach(a => { const cb = h('input', { type: 'checkbox', checked: sel.has(a.id) ? true : null });
      cb.onchange = () => { if (cb.checked) { if (sel.size >= 4) { cb.checked = false; toast('No máximo 4 itens.', true); return; } sel.add(a.id); } else sel.delete(a.id); };
      caixa.append(h('label', { class: 'pers-item' }, cb, h('span', { text: a.ic + '  ' + a.nome }))); });
    const m = abrirModal('Personalizar barra', h('div', {}, h('div', { class: 'hint', text: 'Escolha até 4 itens para a barra inferior (a ordem é a desta lista). O resto fica em "Mais".' }), caixa,
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary', text: 'Cancelar', onclick: () => m.fechar() }),
        h('button', { class: 'btn', text: 'Salvar', onclick: () => { try { localStorage.setItem(this.chaveBarra(), JSON.stringify(abas.map(a => a.id).filter(id => sel.has(id)))); } catch (e) {} m.fechar(); this.montarNavegacao(); } }))));
  },

  async sair() { try { await API.chamar('logout', {}, { semExpirar: true }); } catch (e) {} this.limparSessao(); },
  limparSessao() {
    API.guardar(''); this.sessao = null; this.dados = null; this.aba = 'inicio'; veiculoSel = null;
    $$('.overlay.show').forEach(o => { if (!o.id) o.remove(); else o.classList.remove('show'); });
    const p = $('#perfilPop'); if (p) p.remove();
    $('#app').hidden = true; $('#auth').hidden = false; Auth.mostrar('entrar');
  },
  async retomar() {
    if (!API.token()) return Auth.mostrar('entrar');
    $('#auth').hidden = true; $('#carregando').hidden = false;
    try { await this.iniciar({}); } catch (e) { $('#app').hidden = true; $('#auth').hidden = false; Auth.mostrar('entrar'); }
    $('#carregando').hidden = true;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  API.aoExpirar = () => { if (App.sessao) { toast('Sua sessão expirou. Entre novamente.', true); App.limparSessao(); } };
  document.addEventListener('click', e => { const p = $('#perfilPop'); if (p && !p.contains(e.target)) p.remove(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && App.sessao && !$('.overlay.show')) App.recarregar(true); });
  $$('.logo-img').forEach(lg => { const sem = () => { lg.style.display = 'none'; const t = $('.logo-txt', lg.parentNode); if (t) t.hidden = false; }; lg.addEventListener('error', sem); if (lg.complete && lg.naturalWidth === 0) sem(); });
  if (typeof ESCALA_DESGASTE !== 'undefined' && $('#pneusEscala')) $('#pneusEscala').style.background = 'linear-gradient(90deg, ' + ESCALA_DESGASTE.map(e => rgbCss(e[1]) + ' ' + Math.round(e[0] * 100) + '%').join(', ') + ')';
  App.retomar();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});
