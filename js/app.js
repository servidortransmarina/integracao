/* Casca do sistema: abas por perfil, barra superior (desktop) e inferior (celular) com "Mais" personalizável. */
const TODOS_P = ['master', 'admin', 'mecanico', 'motorista'], GESTAO_P = ['master', 'admin'], OFICINA_P = ['master', 'admin', 'mecanico'];
const ABAS = [
  { id: 'inicio', nome: 'Início', ic: '🏠', perfis: TODOS_P, render: () => Inicio.render() },
  { id: 'frota', nome: 'Frota', ic: '🚛', perfis: OFICINA_P, render: () => Frota.render() },
  { id: 'alertas', nome: 'Alertas', ic: '🔔', perfis: OFICINA_P, render: () => Frota.renderAlertas() },
  { id: 'checklists', nome: 'Checklists', ic: '✅', perfis: ['master', 'admin', 'motorista'], soon: 'Fase 4 — checklist com fotos e avaliação.' },
  { id: 'abastecimento', nome: 'Abastecer', ic: '⛽', perfis: ['motorista'], soon: 'Fase 5 — lançar abastecimento e ganhar pontos.' },
  { id: 'dashboard', nome: 'Dashboard', ic: '📊', perfis: GESTAO_P, soon: 'Fase 5 — barras empilhadas e gráfico de linha com previsão.' },
  { id: 'pneus', nome: 'Pneus', ic: '🛞', perfis: GESTAO_P, soon: 'Fase 3 — controle de pneus (a lógica do GF será trazida para cá).' },
  { id: 'podio', nome: 'Pódio', ic: '🏆', perfis: GESTAO_P, soon: 'Fase 6 — ranking dos motoristas com setas de subida e descida.' }
];

const App = {
  sessao: null, dados: null, aba: 'inicio',

  async iniciar(login) {
    // login = resposta de "login" (traz token) ou de "me" (retomada)
    if (login.token) API.guardar(login.token);
    const me = await API.chamar('me');
    this.sessao = { usuario: me.usuario, nome: me.nome, email: me.email, avatar: me.avatar || '🙂', perfil: (me.acessos && me.acessos.frota) || '', acessos: me.acessos };
    if (!this.sessao.perfil) { API.guardar(''); throw new Error('Sua conta ainda não tem acesso a nenhum sistema.'); }
    $('#auth').hidden = true; $('#app').hidden = false;
    this.montarCabecalho(); this.montarNavegacao();
    if (login.trocarSenha) { exigirTrocaSenha(() => this.recarregar()); return; }
    await this.recarregar();
  },

  async recarregar(silencioso) {
    try { this.dados = await API.chamar('getBootstrap'); } catch (e) { if (!silencioso) toast(e.message, true); return; }
    this.sessao.perfil = this.dados.perfil || this.sessao.perfil;
    this.montarCabecalho(); this.montarNavegacao(); this.abrirAba(this.abaValida(this.aba));
    if (this.sessao.perfil === 'master') Usuarios.contarPendentes();
  },

  abasDoPerfil() { return ABAS.filter(a => a.perfis.indexOf(this.sessao.perfil) >= 0); },
  abaValida(id) { return this.abasDoPerfil().some(a => a.id === id) ? id : 'inicio'; },

  montarCabecalho() {
    $('#tituloTopo').textContent = (ABAS.find(a => a.id === this.aba) || {}).nome || 'Início';
    const ic = $('#perfilIcone'); ic.textContent = this.sessao.avatar || '🙂';
    const menu = limpar($('#perfilMenu'));
    menu.append(h('div', { class: 'perfil-nome' }, this.sessao.nome, h('small', { text: NOME_PERFIL[this.sessao.perfil] || '' })), h('hr'),
      h('button', { onclick: () => { this.fecharMenu(); Perfil.abrir(); } }, '✏️ Editar perfil'));
    if (this.sessao.perfil === 'master') menu.append(h('button', { onclick: () => { this.fecharMenu(); Usuarios.abrir(); } }, '👥 Usuários', h('span', { class: 'badge red', id: 'badgeUsuarios', hidden: true })));
    menu.append(h('hr'), h('button', { onclick: () => this.sair() }, '🚪 Sair do sistema'));
  },
  fecharMenu() { $('#perfilMenu').classList.remove('show'); },

  /* ---- navegação ---- */
  chaveBarra() { return 'trm.barra.' + this.sessao.usuario; },
  abasDaBarra() {
    const todas = this.abasDoPerfil().map(a => a.id); let escolhidas = [];
    try { escolhidas = JSON.parse(localStorage.getItem(this.chaveBarra()) || '[]'); } catch (e) {}
    escolhidas = escolhidas.filter(id => todas.indexOf(id) >= 0).slice(0, 4);
    if (!escolhidas.length) escolhidas = todas.slice(0, todas.length > 5 ? 4 : 5);
    return escolhidas;
  },
  montarNavegacao() {
    const abas = this.abasDoPerfil(), top = limpar($('#topnav')), barra = limpar($('#bottombar'));
    abas.forEach(a => top.append(h('button', { dataset: { aba: a.id }, class: a.id === this.aba ? 'active' : '', onclick: () => this.abrirAba(a.id) }, a.nome)));
    const naBarra = abas.length > 5 ? this.abasDaBarra() : abas.map(a => a.id);
    naBarra.forEach(id => { const a = abas.find(x => x.id === id); barra.append(h('button', { dataset: { aba: id }, class: id === this.aba ? 'active' : '', onclick: () => this.abrirAba(id) }, h('span', { class: 'ic', text: a.ic }), a.nome)); });
    if (abas.length > 5) barra.append(h('button', { dataset: { aba: '__mais' }, onclick: () => this.abrirMais() }, h('span', { class: 'ic', text: '⋯' }), 'Mais'));
  },
  abrirAba(id) {
    this.aba = id; const a = ABAS.find(x => x.id === id); if (!a) return;
    $$('[data-aba]').forEach(b => b.classList.toggle('active', b.dataset.aba === id));
    $('#tituloTopo').textContent = a.nome;
    const main = limpar($('#conteudo'));
    if (a.soon) main.append(h('div', { class: 'card soon' }, h('b', { text: a.nome }), 'Em construção. ' + a.soon));
    else { const r = a.render(); if (r) main.append(r); }
    window.scrollTo(0, 0);
  },
  abrirMais() {
    const abas = this.abasDoPerfil(), lista = h('div', { class: 'mais-list' });
    abas.forEach(a => lista.append(h('button', { onclick: () => { m.fechar(); this.abrirAba(a.id); } }, h('span', { class: 'ic', text: a.ic }), a.nome)));
    const corpo = h('div', {}, lista, h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary small', text: 'Personalizar barra', onclick: () => { m.fechar(); this.personalizar(); } })));
    const m = abrirModal('Menu', corpo);
  },
  personalizar() {
    const abas = this.abasDoPerfil(), sel = new Set(this.abasDaBarra()), caixa = h('div');
    const aviso = h('div', { class: 'hint', text: 'Escolha até 4 itens para a barra inferior. O resto fica em "Mais".' });
    abas.forEach(a => { const cb = h('input', { type: 'checkbox', checked: sel.has(a.id) ? true : null });
      cb.onchange = () => { if (cb.checked) { if (sel.size >= 4) { cb.checked = false; toast('No máximo 4 itens.', true); return; } sel.add(a.id); } else sel.delete(a.id); };
      caixa.append(h('label', { class: 'pers-item' }, cb, h('span', { text: a.ic + '  ' + a.nome }))); });
    const m = abrirModal('Personalizar barra', h('div', {}, aviso, caixa, h('div', { class: 'modal-actions' },
      h('button', { class: 'btn secondary', text: 'Cancelar', onclick: () => m.fechar() }),
      h('button', { class: 'btn', text: 'Salvar', onclick: () => { try { localStorage.setItem(this.chaveBarra(), JSON.stringify(abas.map(a => a.id).filter(id => sel.has(id)))); } catch (e) {} m.fechar(); this.montarNavegacao(); } }))));
  },

  async sair() {
    try { await API.chamar('logout', {}, { semExpirar: true }); } catch (e) {}
    this.limparSessao();
  },
  limparSessao() {
    API.guardar(''); this.sessao = null; this.dados = null; this.aba = 'inicio';
    $$('.overlay').forEach(o => o.remove());
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
  $('#perfilIcone').addEventListener('click', e => { e.stopPropagation(); $('#perfilMenu').classList.toggle('show'); });
  document.addEventListener('click', e => { if (!e.target.closest('.perfil-wrap')) App.fecharMenu(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && App.sessao) App.recarregar(true); });
  const lg = $('.header-logo'); if (lg) { const sem = () => { lg.style.display = 'none'; $('#logoTxt').hidden = false; }; lg.addEventListener('error', sem); if (lg.complete && lg.naturalWidth === 0) sem(); }
  App.retomar();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});
