/* Hub: barra lateral (PC), barra inferior (celular), páginas por perfil. As telas de Frota são o GF (js/gf). */
const TODOS_P = ['master', 'admin', 'mecanico', 'motorista'], GESTAO_P = ['master', 'admin'], OFICINA_P = ['master', 'admin', 'mecanico'];
/* Cada aba pertence a um sistema (sis). A barra lateral lista só os sistemas; as abas de cada sistema aparecem no topo (PC) ou na barra inferior (celular). */
const SISTEMAS = [
  { id: 'frota', nome: 'Frota', ic: '🚛', perfis: ['master', 'admin', 'mecanico', 'motorista'], titulo: 'Controle de Manutenção', contador: () => Hub.contarAtencao() },
  { id: 'ponto', nome: 'Ponto', ic: '🕒', perfis: GESTAO_P, futuro: true },
  { id: 'financeiro', nome: 'Financeiro', ic: '💰', perfis: ['master'], futuro: true }
];
const ABAS = [
  { id: 'inicio', sis: 'painel', nome: 'Painel Transmarina', curto: 'Painel', ic: '🏠', perfis: TODOS_P },
  { id: 'frota', sis: 'frota', nome: 'Frota & Manutenções', curto: 'Frota', ic: '🚛', perfis: OFICINA_P, gf: 'manutencao' },
  { id: 'dashboard', sis: 'frota', nome: 'Dashboard Analítico', curto: 'Dashboard', ic: '📊', perfis: GESTAO_P, gf: 'dashboard' },
  { id: 'alertas', sis: 'frota', nome: 'Alertas', curto: 'Alertas', ic: '🔔', perfis: OFICINA_P, gf: 'alertas', contador: () => Hub.contarAtencao() },
  { id: 'pneus', sis: 'frota', nome: 'Controle de Pneus', curto: 'Pneus', ic: '🛞', perfis: GESTAO_P, gf: 'pneus' },
  { id: 'checklists', sis: 'frota', nome: 'Checklists', curto: 'Checklists', ic: '✅', perfis: ['master', 'admin', 'motorista'], soon: 'Em breve — checklist com fotos e avaliação.' },
  { id: 'abastecimento', sis: 'frota', nome: 'Abastecer', curto: 'Abastecer', ic: '⛽', perfis: ['motorista'], soon: 'Em breve — lançar abastecimento e ganhar pontos.' },
  { id: 'podio', sis: 'frota', nome: 'Pódio', curto: 'Pódio', ic: '🏆', perfis: GESTAO_P, soon: 'Em breve — ranking dos motoristas com setas de subida e descida.' }
];

/** "JOAO PAULO DE SOUZA" → "Joao Paulo de Souza" (acentos só o master consegue corrigir no cadastro). */
function nomeBonito(n) {
  const t = String(n || '').trim(); if (!t || t !== t.toUpperCase()) return t;
  return t.toLowerCase().split(/\s+/).map((p, i) => (i && /^(de|da|do|dos|das|e)$/.test(p)) ? p : p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

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
  abaValida(id) { const a = this.abasDoPerfil().find(x => x.id === id); return a ? id : 'inicio'; },
  sistemasDoPerfil() { return SISTEMAS.filter(x => x.perfis.indexOf(this.sessao.perfil) >= 0); },
  abaAtual() { return ABAS.find(x => x.id === this.aba); },

  /* ---- usuário / menu ---- */
  montarUsuario() {
    const S = this.sessao, pend = S.perfil === 'master' ? (Usuarios.pendentes || 0) + ((this.dados && this.dados.pendenciasPlaca) || 0) : 0;
    const av = () => { const e = h('span', { class: 'avatar', text: S.avatar || '🙂' }); if (pend) e.append(h('span', { class: 'dot', text: String(pend) })); return e; };
    const su = limpar($('#sideUser')); su.append(av(), h('div', {}, h('div', { class: 'nm', text: nomeBonito(S.nome) }), h('small', { text: NOME_PERFIL[S.perfil] || '' })));
    su.onclick = e => { e.stopPropagation(); this.menuPerfil(su, true); };
    const tu = limpar($('#topUser')); tu.append(S.avatar || '🙂'); if (pend) tu.append(h('span', { class: 'dot', text: String(pend) }));
    tu.onclick = e => { e.stopPropagation(); this.menuPerfil(tu, false); };
  },
  menuPerfil(ancora, paraCima) {
    const antigo = $('#perfilPop'); if (antigo) { antigo.remove(); return; }
    const S = this.sessao, pop = h('div', { class: 'pop', id: 'perfilPop' }, h('div', { class: 'nome' }, nomeBonito(S.nome), h('small', { text: NOME_PERFIL[S.perfil] })), h('hr'),
      h('button', { onclick: () => { pop.remove(); Perfil.abrir(); } }, '✏️ Editar perfil'));
    if (S.perfil === 'master') {
      const np = (this.dados && this.dados.pendenciasPlaca) || 0;
      pop.append(h('button', { onclick: () => { pop.remove(); Usuarios.abrir(); } }, '👥 Usuários', Usuarios.pendentes ? h('span', { class: 'badge red', text: String(Usuarios.pendentes) }) : null),
        h('button', { onclick: () => { pop.remove(); Pendencias.abrir(); } }, '🧾 Pendências de placa', np ? h('span', { class: 'badge red', text: String(np) }) : null));
    }
    pop.append(h('hr'), h('button', { onclick: () => { pop.remove(); this.sair(); } }, '🚪 Sair do sistema'));
    document.body.append(pop);
    const r = ancora.getBoundingClientRect(), w = pop.offsetWidth, hh = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, paraCima ? r.left : r.right - w)) + 'px';
    pop.style.top = (paraCima ? Math.max(8, r.top - hh - 8) : r.bottom + 8) + 'px';
  },

  /* ---- navegação ---- */
  chaveBarra() { return 'trm.barra.' + this.sessao.usuario; },
  abasUsaveis() { return this.abasDoPerfil(); },
  abasDaBarra() {
    const todas = this.abasUsaveis().map(a => a.id); let esc = [];
    try { esc = JSON.parse(localStorage.getItem(this.chaveBarra()) || '[]'); } catch (e) {}
    esc = esc.filter(id => todas.indexOf(id) >= 0 && id !== 'inicio').slice(0, 4);
    if (!esc.length) esc = todas.filter(id => id !== 'inicio').slice(0, 4);
    return ['inicio'].concat(esc);
  },
  badge(a) { try { return a.contador ? a.contador() : 0; } catch (e) { return 0; } },
  montarNavegacao() {
    const lado = limpar($('#sideNav')), atual = this.abaAtual(), sisAtual = atual ? atual.sis : 'painel';
    const item = (id, ic, nome, ativo, futuro, n, clique) => h('button', { class: 'side-item' + (futuro ? ' futuro' : '') + (ativo ? ' active' : ''), dataset: { aba: id }, onclick: futuro ? null : clique },
      h('span', { class: 'ic', text: ic }), nome, n ? h('span', { class: 'n', text: String(n) }) : null, futuro ? h('span', { class: 'tag', text: 'em breve' }) : null);
    lado.append(item('inicio', '🏠', 'Painel Transmarina', sisAtual === 'painel', false, 0, () => this.abrirAba('inicio')));
    const sis = this.sistemasDoPerfil(), ativos = sis.filter(x => !x.futuro), breve = sis.filter(x => x.futuro);
    if (ativos.length) lado.append(h('div', { class: 'side-sec', text: 'Sistemas' }), ...ativos.map(x => item(x.id, x.ic, x.nome, sisAtual === x.id, false, this.badge(x), () => this.abrirSistema(x.id))));
    if (breve.length) lado.append(h('div', { class: 'side-sec', text: 'Em breve' }), ...breve.map(x => item(x.id, x.ic, x.nome, false, true, 0)));

    // abas do sistema aberto (topo, PC)
    const topo = limpar($('#subTabs')), abasSis = this.abasDoPerfil().filter(a => a.sis === sisAtual && sisAtual !== 'painel');
    topo.hidden = !abasSis.length;
    abasSis.forEach(a => { const n = this.badge(a); topo.append(h('button', { type: 'button', class: 'subtab' + (a.id === this.aba ? ' active' : ''), dataset: { aba: a.id }, onclick: () => this.abrirAba(a.id) }, a.nome, n ? h('span', { class: 'n', text: String(n) }) : null)); });

    // barra inferior (celular): Painel + abas, personalizável
    const barra = limpar($('#bottombar')), usaveis = this.abasUsaveis();
    const naBarra = usaveis.length > 5 ? this.abasDaBarra() : usaveis.map(a => a.id);
    naBarra.forEach(id => { const a = usaveis.find(x => x.id === id); if (!a) return; const n = this.badge(a);
      barra.append(h('button', { dataset: { aba: id }, class: id === this.aba ? 'active' : '', onclick: () => this.abrirAba(id) }, h('span', { class: 'ic', text: a.ic }), a.curto || a.nome, n ? h('span', { class: 'n', text: String(n) }) : null)); });
    if (usaveis.length > 5) barra.append(h('button', { onclick: () => this.abrirMais() }, h('span', { class: 'ic', text: '⋯' }), 'Mais'));
  },
  abrirSistema(id) {
    const abas = this.abasDoPerfil().filter(a => a.sis === id); if (!abas.length) return;
    const ult = this.ultimaAba && this.ultimaAba[id]; this.abrirAba(abas.find(a => a.id === ult) ? ult : abas[0].id);
  },

  abrirAba(id) {
    const a = ABAS.find(x => x.id === id); if (!a) return;
    this.aba = id; (this.ultimaAba = this.ultimaAba || {})[a.sis] = id;
    this.montarNavegacao();
    const sis = SISTEMAS.find(x => x.id === a.sis);
    $('#tituloTopo').textContent = a.gf ? ((sis && sis.titulo) || a.nome) : a.nome;
    const hubC = limpar($('#hubConteudo')), gfR = $('#gfRoot');
    $('#btnImprimir').hidden = !(a.gf && OFICINA_P.indexOf(this.sessao.perfil) >= 0);
    $('#btnAtualizar').hidden = false;
    if (a.gf) {
      hubC.hidden = true; gfR.hidden = false;
      $$('#gfRoot > .tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + a.gf));
      gfAba = a.gf; renderTelaAtual();
    } else {
      gfR.hidden = true; hubC.hidden = false;
      if (a.soon) hubC.append(h('div', { class: 'card soon' }, h('b', { text: a.nome }), a.soon));
      else hubC.append(Inicio.render());
    }
    window.scrollTo(0, 0);
  },
  abrirMais() {
    const abas = this.abasUsaveis(), lista = h('div', { class: 'mais-list' });
    abas.forEach(a => lista.append(h('button', { onclick: () => { m.fechar(); this.abrirAba(a.id); } }, h('span', { class: 'ic', text: a.ic }), a.curto || a.nome)));
    const m = abrirModal('Menu', h('div', {}, lista, h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary small', text: 'Personalizar barra', onclick: () => { m.fechar(); this.personalizar(); } }))));
  },
  personalizar() {
    const abas = this.abasUsaveis().filter(a => a.id !== 'inicio'), sel = new Set(this.abasDaBarra().filter(id => id !== 'inicio')), caixa = h('div');
    abas.forEach(a => { const cb = h('input', { type: 'checkbox', checked: sel.has(a.id) ? true : null });
      cb.onchange = () => { if (cb.checked) { if (sel.size >= 4) { cb.checked = false; toast('No máximo 4 itens.', true); return; } sel.add(a.id); } else sel.delete(a.id); };
      caixa.append(h('label', { class: 'pers-item' }, cb, h('span', { text: a.ic + '  ' + a.nome }))); });
    const m = abrirModal('Personalizar barra', h('div', {}, h('div', { class: 'hint', text: 'O Painel fica sempre na barra. Escolha até 4 outros itens; o resto fica em "Mais".' }), caixa,
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary', text: 'Cancelar', onclick: () => m.fechar() }),
        h('button', { class: 'btn', text: 'Salvar', onclick: () => { try { localStorage.setItem(this.chaveBarra(), JSON.stringify(abas.map(a => a.id).filter(id => sel.has(id)))); } catch (e) {} m.fechar(); this.montarNavegacao(); } }))));
  },

  async sair() { try { await API.chamar('logout', {}, { semExpirar: true }); } catch (e) {} this.limparSessao(); },
  limparSessao() {
    API.guardar(''); this.sessao = null; this.dados = null; this.aba = 'inicio'; this.ultimaAba = {}; veiculoSel = null;
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
