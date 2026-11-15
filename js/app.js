/* Hub: barra lateral (PC), barra inferior (celular), páginas por perfil. As telas de Frota são o GF (js/gf). */
const TODOS_P = ['master', 'admin', 'mecanico', 'motorista'], GESTAO_P = ['master', 'admin'], OFICINA_P = ['master', 'admin', 'mecanico'];
/* Cada aba pertence a um sistema (sis). A barra lateral lista só os sistemas; as abas de cada sistema aparecem no topo (PC) ou na barra inferior (celular). */
const SISTEMAS = [
  { id: 'frota', chave: 'manutencao', nome: 'Manutenção', ic: '🔧', perfis: OFICINA_P, titulo: 'Controle de Manutenção', contador: () => Hub.contarAtencao() },
  { id: 'fleet', chave: 'fleet', nome: 'Fleet', ic: '🚛', perfis: TODOS_P, titulo: 'Fleet' },
  { id: 'ponto', chave: 'ponto', nome: 'Ponto', ic: '🕒', perfis: GESTAO_P, titulo: 'Gestão de Ponto' },
  { id: 'financeiro', chave: 'financeiro', nome: 'Financeiro', ic: '💰', perfis: ['master'], futuro: true },
  { id: 'escalas', chave: 'escalas', nome: 'Escalas', ic: '📅', perfis: GESTAO_P, futuro: true },
  { id: 'almoxarifado', chave: 'almoxarifado', nome: 'Almoxarifado', ic: '📦', perfis: OFICINA_P, futuro: true }
];
const ABAS = [
  { id: 'inicio', sis: 'painel', nome: 'Painel Transmarina', curto: 'Painel', ic: '🏠', perfis: TODOS_P },
  { id: 'frota', sis: 'frota', nome: 'Frota & Manutenções', curto: 'Frota', ic: '🚛', perfis: OFICINA_P, gf: 'manutencao' },
  { id: 'dashboard', sis: 'frota', nome: 'Dashboard Analítico', curto: 'Dashboard', ic: '📊', perfis: OFICINA_P, gf: 'dashboard' },
  { id: 'alertas', sis: 'frota', nome: 'Alertas', curto: 'Alertas', ic: '🔔', perfis: OFICINA_P, gf: 'alertas', contador: () => Hub.contarAtencao() },
  { id: 'pneus', sis: 'frota', nome: 'Controle de Pneus', curto: 'Pneus', ic: '🛞', perfis: GESTAO_P, gf: 'pneus' },
  { id: 'checklists', sis: 'fleet', nome: 'Checklists', curto: 'Checklists', ic: '✅', perfis: TODOS_P, soon: 'Em breve — checklist com fotos e avaliação.' },
  { id: 'abastecimento', sis: 'fleet', nome: 'Abastecer', curto: 'Abastecer', ic: '⛽', perfis: ['motorista'], soon: 'Em breve — lançar abastecimento e ganhar pontos.' },
  { id: 'ocorrencias', sis: 'fleet', nome: 'Ocorrências', curto: 'Ocorrências', ic: '⚠️', perfis: ['master', 'admin', 'motorista'], soon: 'Em breve — ocorrências registradas pelos motoristas.' },
  { id: 'motoristas', sis: 'fleet', nome: 'Motoristas', curto: 'Motoristas', ic: '👥', perfis: GESTAO_P, hub: () => Motoristas.render() },
  { id: 'ponto-horas', sis: 'ponto', nome: 'Horas extras', curto: 'Horas', ic: '⏱️', perfis: TODOS_P, ponto: 'horas' },
  { id: 'ponto-folgas', sis: 'ponto', nome: 'Controle de folgas', curto: 'Folgas', ic: '🗓️', perfis: TODOS_P, ponto: 'folgas' },
  { id: 'ponto-cartas', sis: 'ponto', nome: 'Cartas de ponto', curto: 'Cartas', ic: '📄', perfis: TODOS_P, ponto: 'cartas', pontoPerfis: ['adm'] },
  { id: 'ponto-pendentes', sis: 'ponto', nome: 'Cartas pendentes', curto: 'Pendentes', ic: '✅', perfis: TODOS_P, ponto: 'pendentes' },
  { id: 'podio', sis: 'fleet', nome: 'Pódio', curto: 'Pódio', ic: '🏆', perfis: ['master', 'admin', 'motorista'], soon: 'Em breve — ranking dos motoristas com setas de subida e descida.' }
];

/** Se o servidor ainda for a versão antiga (sem "sistemas"), usa o padrão do perfil para nada sumir. */
function sistemasPadrao(perfil) {
  const p = { manutencao: ['master', 'admin', 'mecanico'], fleet: TODOS_P, escalas: GESTAO_P, almoxarifado: OFICINA_P, ponto: GESTAO_P, financeiro: ['master'] };
  return Object.keys(p).filter(k => p[k].indexOf(perfil) >= 0);
}
/** "JOAO PAULO DE SOUZA" → "Joao Paulo de Souza" (acentos só o master consegue corrigir no cadastro). */
function nomeBonito(n) {
  return String(n || '').trim().toLocaleUpperCase('pt-BR');          // padrão: nomes de pessoas sempre em CAIXA ALTA
}

/** Para saudação: primeiro nome só com a inicial maiúscula ("Bom dia, João"). */
function primeiroNome(n) { const p = String(n || '').trim().split(/\s+/)[0].toLocaleLowerCase('pt-BR'); return p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1); }

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
    const me = (login.token && login.usuario && login.acessos) ? login : await API.chamar('me');     // o login já traz tudo: poupa uma ida ao servidor (~4 s)
    this.sessao = { usuario: me.usuario, nome: me.nome, email: me.email, avatar: me.avatar || '🔧', perfil: (me.acessos && me.acessos.frota) || '', acessos: me.acessos, pontoPerfil: me.pontoPerfil || '', sistemas: me.sistemas || sistemasPadrao((me.acessos && me.acessos.frota) || '') };
    if (!this.sessao.perfil) { API.guardar(''); throw new Error('Sua conta ainda não tem acesso a nenhum sistema.'); }
    $('#auth').hidden = true; $('#app').hidden = false;
    this.montarUsuario(); this.montarNavegacao();
    if (login.trocarSenha) { exigirTrocaSenha(() => this.recarregar()); return; }
    await this.recarregar();
  },

  async recarregar(silencioso) {
    if (!silencioso) setLoading(true);
    try { this.dados = await API.chamar('getBootstrap'); } catch (e) { setLoading(false); if (!silencioso) toast(e.message, true);
      if (!this.dados) { $('#gfRoot').hidden = true; const c = limpar($('#hubConteudo')); c.hidden = false; c.append(h('div', { class: 'card' }, h('h2', { text: 'Não consegui carregar os dados' }), h('p', { class: 'hint', text: e.message }), h('button', { class: 'btn', text: 'Tentar de novo', onclick: () => this.recarregar() }))); }
      return; }
    setLoading(false);
    this.sessao.perfil = this.dados.perfil || this.sessao.perfil;
    Hub.aposDados(); this.montarUsuario(); this.montarNavegacao();
    if (this.sessao.perfil === 'master') await Usuarios.contarPendentes();
    this.abrirAba(this.abaValida(this.aba));
  },

  abasDoPerfil() { const sis = this.sistemasDoPerfil().map(x => x.id), pp = this.sessao.pontoPerfil || ''; return ABAS.filter(a => a.perfis.indexOf(this.sessao.perfil) >= 0 && (a.sis === 'painel' || sis.indexOf(a.sis) >= 0) && (!a.ponto || (pp && (a.pontoPerfis || ['adm', 'encarregado']).indexOf(pp) >= 0))); },
  abaValida(id) { const a = this.abasDoPerfil().find(x => x.id === id); return a ? id : 'inicio'; },
  sistemasDoPerfil() { const v = this.sessao.sistemas || []; return SISTEMAS.filter(x => v.indexOf(x.chave) >= 0); },
  abaAtual() { return ABAS.find(x => x.id === this.aba); },

  /* ---- usuário / menu ---- */
  montarUsuario() {
    const S = this.sessao, pend = S.perfil === 'master' ? (Usuarios.pendentes || 0) + ((this.dados && this.dados.pendenciasPlaca) || 0) : 0;
    const av = () => { const e = h('span', { class: 'avatar' }, avatarNo(S.avatar)); if (pend) e.append(h('span', { class: 'dot', text: String(pend) })); return e; };
    const su = limpar($('#sideUser')); su.append(av(), h('div', {}, h('div', { class: 'nm', text: nomeBonito(S.nome) }), h('small', { text: NOME_PERFIL[S.perfil] || '' })));
    su.onclick = e => { e.stopPropagation(); this.menuPerfil(su, true); };
    const tu = limpar($('#topUser')); tu.append(avatarNo(S.avatar)); if (pend) tu.append(h('span', { class: 'dot', text: String(pend) }));
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

    // barra inferior (celular): Painel + um botão por sistema ativo + Mais. As abas do sistema aparecem numa faixa no topo.
    const barra = limpar($('#bottombar'));
    const bt = (id, ic, nome, ativo, n, clique) => h('button', { dataset: { aba: id }, class: ativo ? 'active' : '', onclick: clique }, h('span', { class: 'ic', text: ic }), nome, n ? h('span', { class: 'n', text: String(n) }) : null);
    barra.append(bt('inicio', '🏠', 'Painel', sisAtual === 'painel', 0, () => this.abrirAba('inicio')));
    ativos.forEach(x => { if (this.abasDoPerfil().some(a => a.sis === x.id)) barra.append(bt(x.id, x.ic, x.nome, sisAtual === x.id, this.badge(x), () => this.abrirSistema(x.id))); });
    barra.append(bt('mais', '⋯', 'Mais', false, 0, () => this.abrirMais()));
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
    const dash = $('#tab-dashboard'); if (dash) dash.classList.toggle('dash-mec', this.sessao.perfil === 'mecanico');
    if (a.ponto) {
      hubC.hidden = true; gfR.hidden = true; $('#btnAtualizar').hidden = true; PontoHub.abrir(a.ponto);
    } else if (a.gf) {
      PontoHub.esconder(); hubC.hidden = true; gfR.hidden = false;
      $$('#gfRoot > .tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + a.gf));
      gfAba = a.gf; renderTelaAtual();
    } else {
      PontoHub.esconder(); gfR.hidden = true; hubC.hidden = false;
      if (a.hub) hubC.append(a.hub());
      else if (a.soon) hubC.append(h('div', { class: 'card soon' }, h('b', { text: a.nome }), a.soon));
      else hubC.append(Inicio.render());
    }
    window.scrollTo(0, 0);
  },
  /** "Mais" do celular: só o menu geral (sistemas, conta, sair). As abas de cada sistema ficam na faixa do topo. */
  abrirMais() {
    const S = this.sessao, caixa = h('div'), m = abrirModal('Menu', caixa), item = (ic, texto, fn, extra) => h('button', { class: 'mais-item', type: 'button', disabled: fn ? null : true, onclick: fn ? () => { m.fechar(); fn(); } : null }, h('span', { class: 'ic', text: ic }), h('span', { class: 'tx', text: texto }), extra || null);
    caixa.append(h('div', { class: 'side-sec', text: 'Sistemas' }));
    this.sistemasDoPerfil().forEach(x => caixa.append(item(x.ic, x.nome, x.futuro ? null : () => this.abrirSistema(x.id), x.futuro ? h('small', { text: 'em breve' }) : null)));
    caixa.append(h('div', { class: 'side-sec', text: 'Minha conta' }), item('✏️', 'Editar perfil', () => Perfil.abrir()));
    if (S.perfil === 'master') {
      const np = (this.dados && this.dados.pendenciasPlaca) || 0;
      caixa.append(item('👥', 'Usuários', () => Usuarios.abrir(), Usuarios.pendentes ? h('span', { class: 'badge red', text: String(Usuarios.pendentes) }) : null), item('🧾', 'Pendências de placa', () => Pendencias.abrir(), np ? h('span', { class: 'badge red', text: String(np) }) : null));
    }
    caixa.append(item('🚪', 'Sair do sistema', () => this.sair()));
  },

  async sair() { try { await API.chamar('logout', {}, { semExpirar: true }); } catch (e) {} this.limparSessao(); },
  limparSessao() {
    API.guardar(''); this.sessao = null; this.dados = null; this.aba = 'inicio'; this.ultimaAba = {}; veiculoSel = null; PontoHub.reiniciar();
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
  document.addEventListener('click', e => { const p = $('#perfilPop'); if (p && !p.contains(e.target)) p.remove(); const o = $('#ocultarPop'); if (o && !o.contains(e.target)) o.remove(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && App.sessao && !$('.overlay.show')) App.recarregar(true); });
  $$('.logo-img').forEach(lg => { const sem = () => { lg.style.display = 'none'; const t = $('.logo-txt', lg.parentNode); if (t) t.hidden = false; }; lg.addEventListener('error', sem); if (lg.complete && lg.naturalWidth === 0) sem(); });
  if (typeof ESCALA_DESGASTE !== 'undefined' && $('#pneusEscala')) $('#pneusEscala').style.background = 'linear-gradient(90deg, ' + ESCALA_DESGASTE.map(e => rgbCss(e[1]) + ' ' + Math.round(e[0] * 100) + '%').join(', ') + ')';
  App.retomar();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});
