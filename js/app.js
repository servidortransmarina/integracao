/* Hub: barra lateral (PC), barra inferior (celular), páginas por perfil. As telas de Frota são o GF (js/gf). */
const TODOS_P = ['master', 'admin', 'mecanico', 'motorista'], GESTAO_P = ['master', 'admin'], OFICINA_P = ['master', 'admin', 'mecanico'];
/* Cada aba pertence a um sistema (sis). A barra lateral lista só os sistemas; as abas de cada sistema aparecem no topo (PC) ou na barra inferior (celular). */
const SISTEMAS = [
  { id: 'frota', chave: 'manutencao', nome: 'Manutenção', ic: '🔧', perfis: OFICINA_P, titulo: 'Controle de Manutenção', contador: () => Hub.contarAtencao() },
  { id: 'fleet', chave: 'fleet', nome: 'Fleet', ic: '🚛', perfis: TODOS_P, titulo: 'Fleet' },
  { id: 'ponto', chave: 'ponto', nome: 'Ponto', ic: '🕒', perfis: GESTAO_P, titulo: 'Gestão de Ponto' },
  { id: 'financeiro', chave: 'financeiro', nome: 'Financeiro', ic: '💰', perfis: GESTAO_P, titulo: 'Financeiro' },
  { id: 'escalas', chave: 'escalas', nome: 'Escalas', ic: '📅', perfis: GESTAO_P, titulo: 'Escalas' },
  { id: 'almoxarifado', chave: 'almoxarifado', nome: 'Almoxarifado', ic: '📦', perfis: OFICINA_P, futuro: true }
];
const ABAS = [
  { id: 'inicio', sis: 'painel', nome: 'Painel Transmarina', curto: 'Painel', ic: '🏠', perfis: TODOS_P },
  { id: 'frota', sis: 'frota', nome: 'Frota & Manutenções', curto: 'Frota', ic: '🚛', perfis: OFICINA_P, gf: 'manutencao' },
  { id: 'dashboard', sis: 'frota', nome: 'Dashboard Analítico', curto: 'Dashboard', ic: '📊', perfis: OFICINA_P, gf: 'dashboard' },
  { id: 'alertas', sis: 'frota', nome: 'Alertas', curto: 'Alertas', ic: '🔔', perfis: OFICINA_P, gf: 'alertas', contador: () => Hub.contarAtencao() },
  { id: 'pneus', sis: 'frota', nome: 'Controle de Pneus', curto: 'Pneus', ic: '🛞', perfis: GESTAO_P, gf: 'pneus' },
  { id: 'checklists', sis: 'fleet', nome: 'Checklist', curto: 'Checklist', ic: '✅', perfis: TODOS_P, hub: () => App.sessao.perfil === 'motorista' ? Motorista.checklist() : Motorista.gestaoChecklists() },
  { id: 'abastecimento', sis: 'fleet', nome: 'Abastecimento', curto: 'Abastecer', ic: '⛽', perfis: ['motorista'], hub: () => Motorista.abastecer() },
  { id: 'defeito', sis: 'fleet', nome: 'Relatar defeito', curto: 'Defeito', ic: '🛠️', perfis: ['motorista'], hub: () => Motorista.defeito() },
  { id: 'manutmot', sis: 'fleet', nome: 'Lançar manutenção', curto: 'Manutenção', ic: '🔧', perfis: ['motorista'], hub: () => Motorista.manutencao() },
  { id: 'historico', sis: 'fleet', nome: 'Histórico', curto: 'Histórico', ic: '🗂️', perfis: ['motorista'], hub: () => Motorista.historico() },
  { id: 'escala', sis: 'fleet', nome: 'Escalas', curto: 'Escalas', ic: '📅', perfis: ['motorista'], hub: () => Motorista.escala() },
  { id: 'ocorrencias', sis: 'fleet', nome: 'Ocorrências', curto: 'Ocorrências', ic: '⚠️', perfis: GESTAO_P, hub: () => Motorista.gestaoOcorrencias() },
  { id: 'motoristas', sis: 'fleet', nome: 'Motoristas', curto: 'Motoristas', ic: '👥', perfis: GESTAO_P, hub: () => Motoristas.render() },
  { id: 'ponto-horas', sis: 'ponto', nome: 'Horas extras', curto: 'Horas', ic: '⏱️', perfis: TODOS_P, ponto: 'horas' },
  { id: 'ponto-folgas', sis: 'ponto', nome: 'Controle de folgas', curto: 'Folgas', ic: '🗓️', perfis: TODOS_P, ponto: 'folgas' },
  { id: 'ponto-cartas', sis: 'ponto', nome: 'Gestão: Pontos e Horas', curto: 'Gestão', ic: '📄', perfis: TODOS_P, ponto: 'cartas', pontoPerfis: ['adm'] },
  { id: 'ponto-pendentes', sis: 'ponto', nome: 'Cartas pendentes', curto: 'Pendentes', ic: '✅', perfis: TODOS_P, ponto: 'pendentes' },
  { id: 'fin-escolha', sis: 'financeiro', nome: 'Financeiro', curto: 'Financeiro', ic: '💰', perfis: GESTAO_P, visivel: () => !Financeiro.area, hub: () => Financeiro.escolha() },
  { id: 'fin-voltar', sis: 'financeiro', nome: 'Trocar', curto: 'Trocar', ic: '↩️', perfis: GESTAO_P, visivel: () => !!Financeiro.area, acao: () => Financeiro.voltar() },
  { id: 'fin-rota-lanc', sis: 'financeiro', nome: 'Lançamento', curto: 'Lançamento', ic: '🧾', perfis: GESTAO_P, visivel: () => Financeiro.area === 'rota', fin: 'lanc' },
  { id: 'fin-rota-planilhas', sis: 'financeiro', nome: 'Planilhas', curto: 'Planilhas', ic: '📑', perfis: GESTAO_P, visivel: () => Financeiro.area === 'rota', fin: 'planilhas' },
  { id: 'fin-rota-ticket', sis: 'financeiro', nome: 'Ticket & Escala', curto: 'Ticket', ic: '🎫', perfis: GESTAO_P, visivel: () => Financeiro.area === 'rota', fin: 'ticket' },
  { id: 'fin-rota-balancos', sis: 'financeiro', nome: 'Balanços e Escalas', curto: 'Balanços', ic: '⚖️', perfis: GESTAO_P, visivel: () => Financeiro.area === 'rota', fin: 'balancos' },
  { id: 'fin-rota-hist', sis: 'financeiro', nome: 'Histórico', curto: 'Histórico', ic: '🗓️', perfis: GESTAO_P, visivel: () => Financeiro.area === 'rota', fin: 'hist' },
  { id: 'fin-loja-op', sis: 'financeiro', nome: 'Operacional', curto: 'Operacional', ic: '🏬', perfis: GESTAO_P, visivel: () => Financeiro.area === 'loja', fin: 'loja:operacional' },
  { id: 'fin-loja-fin', sis: 'financeiro', nome: 'Financeiro', curto: 'Financeiro', ic: '💵', perfis: GESTAO_P, visivel: () => Financeiro.area === 'loja', fin: 'loja:financeiro' },
  { id: 'fin-loja-cb', sis: 'financeiro', nome: 'Relatório CB', curto: 'CB', ic: '📄', perfis: GESTAO_P, visivel: () => Financeiro.area === 'loja', fin: 'loja:cb' },
  { id: 'esc-escala', sis: 'escalas', nome: 'Escala do dia', curto: 'Escala', ic: '📅', perfis: GESTAO_P, esc: 'scale' },
  { id: 'esc-cad', sis: 'escalas', nome: 'Cadastros', curto: 'Cadastros', ic: '👥', perfis: GESTAO_P, esc: 'catalog' },
  { id: 'esc-fin', sis: 'escalas', nome: 'Financeiro da escala', curto: 'Financeiro', ic: '💰', perfis: GESTAO_P, esc: 'finance', visivel: () => (App.sessao.sistemas || []).indexOf('financeiro') >= 0 },
  { id: 'esc-hist', sis: 'escalas', nome: 'Histórico de cargas', curto: 'Histórico', ic: '🗂️', perfis: GESTAO_P, esc: 'history' },
  { id: 'podio', sis: 'fleet', nome: 'Pódio', curto: 'Pódio', ic: '🏆', perfis: GESTAO_P, hub: () => Podio.tela() }
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
  contarAtencao() { try { return db.alertas.filter(a => a.status !== 'resolvido' && grupoAlerta(a) === 'atrasado').length + ocorrenciasAbertas().length; } catch (e) { return 0; } }   // atrasados + ocorrências dos motoristas pendentes
};

const App = {
  sessao: null, dados: null, aba: 'inicio',

  async iniciar(login) {
    if (login.token) API.guardar(login.token);
    const me = (login.token && login.usuario && login.acessos) ? login : await API.chamar('me');     // o login já traz tudo: poupa uma ida ao servidor (~4 s)
    this.sessao = { usuario: me.usuario, nome: me.nome, email: me.email, avatar: me.avatar || '🔧', perfil: (me.acessos && me.acessos.frota) || '', acessos: me.acessos, pontoPerfil: me.pontoPerfil || '', sistemas: me.sistemas || sistemasPadrao((me.acessos && me.acessos.frota) || '') };
    if (!this.sessao.perfil) { API.guardar(''); throw new Error('Sua conta ainda não tem acesso a nenhum sistema.'); }
    $('#auth').hidden = true; $('#app').hidden = false; corBarra('#f3f4f6');
    this.montarUsuario(); this.montarNavegacao();
    if (login.trocarSenha) { exigirTrocaSenha(() => this.recarregar()); return; }
    if (login.dados && login.dados.sucesso) { this.dados = login.dados; delete login.dados; await this.aplicarDados(); return; }
    await this.recarregar();
  },

  async recarregar(silencioso) {
    if (!silencioso) setLoading(true);
    // Atualização silenciosa vai para o segundo plano; se a pessoa lançar algo enquanto ela corre, a resposta (que pode
    // ter saído antes do lançamento) é descartada e uma nova é pedida — assim o que acabou de ser lançado não "some".
    if (silencioso) {
      if (this._recFundo) return this._recFundo;
      const vez = async () => { for (let i = 0; i < 3; i++) { const m0 = API.marco, d = await API.chamar('getBootstrap', {}, { fundo: true }); if (API.marco === m0) return d; } return API.chamar('getBootstrap'); };
      const ocupado = () => { const a = document.activeElement; return !!$('.overlay.show') || !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#hubConteudo, #gfRoot')); };
      this._recFundo = vez().then(async d => {
        this.dados = d;
        // Pessoa preenchendo algo: atualiza números e menus, mas não redesenha a tela por baixo dela.
        if (ocupado()) {
          this.sessao.perfil = d.perfil || this.sessao.perfil; this.juntarHistorico(); Hub.aposDados(); this.montarNavegacao(); Online.atualizar(d);
          const quandoLivre = n => { if (this.dados !== d || !this.sessao) return; if (ocupado() && n < 600) { setTimeout(() => quandoLivre(n + 1), 200); return; } this.abrirAba(this.abaValida(this.aba)); };
          setTimeout(() => quandoLivre(0), 200); return;
        }
        await this.aplicarDados(); }).catch(() => {}).finally(() => { this._recFundo = null; });
      return this._recFundo;
    }
    try { this.dados = await API.chamar('getBootstrap'); } catch (e) { setLoading(false); if (!silencioso) toast(e.message, true);
      if (!this.dados) { $('#gfRoot').hidden = true; const c = limpar($('#hubConteudo')); c.hidden = false; c.append(h('div', { class: 'card' }, h('h2', { text: 'Não consegui carregar os dados' }), h('p', { class: 'hint', text: e.message }), h('button', { class: 'btn', text: 'Tentar de novo', onclick: () => this.recarregar() }))); }
      return; }
    setLoading(false); await this.aplicarDados();
  },
  async aplicarDados() {
    this.sessao.perfil = this.dados.perfil || this.sessao.perfil;
    this.juntarHistorico();
    Hub.aposDados(); this.montarUsuario(); this.montarNavegacao();
    if (this.sessao.perfil === 'master') await Usuarios.contarPendentes();
    this.abrirAba(this.abaValida(this.aba));
    Online.atualizar(this.dados);
    // depois de abrir: completa os últimos 12 meses em segundo plano, sem travar a tela
    if (this.hist && !this.hist.fundo) { this.hist.fundo = true; setTimeout(() => this.pedirHistorico(this.isoMenos(365)), 2500); }
  },

  abasDoPerfil() { const sis = this.sistemasDoPerfil().map(x => x.id), pp = this.sessao.pontoPerfil || ''; return ABAS.filter(a => a.perfis.indexOf(this.sessao.perfil) >= 0 && (a.sis === 'painel' || sis.indexOf(a.sis) >= 0) && (!a.visivel || a.visivel()) && (!a.ponto || (pp && (a.pontoPerfis || ['adm', 'encarregado']).indexOf(pp) >= 0))); },
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
    pop.append(h('button', { onclick: () => { pop.remove(); Ajuda.abrir(); } }, '❓ Ajuda'));
    if (S.perfil === 'master') { const np2 = ((this.dados && this.dados.problemas) || []).length; pop.append(h('button', { onclick: () => { pop.remove(); Ajuda.problemas(); } }, '🐞 Problemas relatados', np2 ? h('span', { class: 'badge red', text: String(np2) }) : null)); }
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
    const item = (id, ic, nome, ativo, futuro, n, clique) => h('button', { class: 'side-item' + (futuro ? ' futuro' : '') + (ativo ? ' active' : ''), dataset: { aba: id }, title: nome, onclick: futuro ? null : clique },
      h('span', { class: 'ic', text: ic }), nome, n ? h('span', { class: 'n', text: String(n) }) : null, futuro ? h('span', { class: 'tag', text: 'em breve' }) : null);
    lado.append(item('inicio', '🏠', 'Painel Transmarina', sisAtual === 'painel', false, 0, () => this.abrirAba('inicio')));
    const abasP = this.abasDoPerfil(), sis = this.sistemasDoPerfil(), ativos = sis.filter(x => !x.futuro && abasP.some(a => a.sis === x.id)), breve = sis.filter(x => x.futuro);
    if (ativos.length) lado.append(h('div', { class: 'side-sec', text: 'Sistemas' }), ...ativos.map(x => item(x.id, x.ic, x.nome, sisAtual === x.id, false, this.badge(x), () => this.abrirSistema(x.id))));
    if (breve.length) lado.append(h('div', { class: 'side-sec', text: 'Em breve' }), ...breve.map(x => item(x.id, x.ic, x.nome, false, true, 0)));

    // abas do sistema aberto (topo, PC)
    const topo = limpar($('#subTabs')), abasSis = this.abasDoPerfil().filter(a => a.sis === sisAtual && sisAtual !== 'painel');
    topo.hidden = !abasSis.length; $('.hub-bar').hidden = topo.hidden;
    abasSis.forEach(a => { const n = this.badge(a); topo.append(h('button', { type: 'button', class: 'subtab' + (a.id === this.aba ? ' active' : ''), dataset: { aba: a.id }, onclick: () => this.abrirAba(a.id) }, a.ic ? h('span', { class: 'st-ic' }, icone(a.ic)) : null, a.nome, n ? h('span', { class: 'n', text: String(n) }) : null)); });

    // barra inferior (celular): Painel + um botão por sistema ativo + Mais. As abas do sistema aparecem numa faixa no topo.
    const barra = limpar($('#bottombar'));
    // Os botões do meio são os atalhos que a pessoa escolheu (sistemas ou telas); sem escolha, um por sistema.
    const bt = (id, ic, nome, ativo, n, clique) => h('button', { dataset: { aba: id }, class: ativo ? 'active' : '', onclick: clique }, h('span', { class: 'ic' }, icone(ic)), nome, n ? h('span', { class: 'n', text: String(n) }) : null);
    barra.append(bt('inicio', '🏠', 'Painel', sisAtual === 'painel', 0, () => this.abrirAba('inicio')));
    const ats = this.atalhos(), telaFixa = ats.some(o => o.tipo === 'a' && o.a.id === this.aba);
    ats.forEach(o => barra.append(o.tipo === 's' ? bt(o.x.id, o.ic, o.nome, sisAtual === o.x.id && !telaFixa, this.badge(o.x), () => this.abrirSistema(o.x.id))
      : bt(o.a.id, o.ic, o.nome, this.aba === o.a.id, this.badge(o.a), () => this.abrirAba(o.a.id))));
    barra.append(bt('mais', '⋯', 'Mais', false, 0, () => this.abrirMais()));
  },
  /* ---- atalhos da barra de baixo (celular): cada pessoa escolhe quais sistemas/telas ficam em destaque ---- */
  ATALHOS_MAX: 5,
  opcoesAtalho() {
    const abas = this.abasDoPerfil(), out = [];
    this.sistemasDoPerfil().filter(x => !x.futuro && abas.some(a => a.sis === x.id)).forEach(x => {
      out.push({ k: 's:' + x.id, tipo: 's', ic: x.ic, nome: x.nome, grupo: x.nome, x });
      abas.filter(a => a.sis === x.id && !a.visivel && !a.acao).forEach(a => out.push({ k: 'a:' + a.id, tipo: 'a', ic: a.ic, nome: a.curto || a.nome, longo: a.nome, grupo: x.nome, a }));
    });
    return out;
  },
  chaveAtalhos() { return 'trm.atalhos.' + ((this.sessao && this.sessao.usuario) || ''); },
  atalhosSalvos() { try { const v = JSON.parse(localStorage.getItem(this.chaveAtalhos()) || 'null'); return Array.isArray(v) ? v : null; } catch (e) { return null; } },
  atalhos() {
    const ops = this.opcoesAtalho(), esc = this.atalhosSalvos();
    const val = esc ? esc.map(k => ops.find(o => o.k === k)).filter(Boolean).slice(0, this.ATALHOS_MAX) : [];
    return val.length ? val : ops.filter(o => o.tipo === 's');
  },
  configAtalhos() {
    const ops = this.opcoesAtalho(), MAX = this.ATALHOS_MAX, marcados = this.atalhos().map(o => o.k), corpo = h('div', { class: 'atalhos-cfg' });
    const conta = h('div', { class: 'atalhos-conta' }), caixas = [];
    const atualizar = () => { const n = marcados.length; conta.textContent = n + ' de ' + MAX + ' escolhidos · Painel e Mais ficam sempre'; caixas.forEach(({ cb, o }) => { cb.disabled = !cb.checked && n >= MAX; }); };
    corpo.append(h('p', { class: 'dim', text: 'Escolha o que fica fixo na barra de baixo do celular. Pode ser um sistema inteiro (abre a última tela usada) ou uma tela específica.' }), conta);
    let grupo = '';
    ops.forEach(o => {
      if (o.grupo !== grupo) { grupo = o.grupo; corpo.append(h('div', { class: 'side-sec', text: grupo })); }
      const cb = h('input', { type: 'checkbox' }); cb.checked = marcados.indexOf(o.k) >= 0;
      cb.onchange = () => { const i = marcados.indexOf(o.k); if (cb.checked && i < 0) marcados.push(o.k); if (!cb.checked && i >= 0) marcados.splice(i, 1); atualizar(); };
      caixas.push({ cb, o });
      corpo.append(h('label', { class: 'atalho-op' + (o.tipo === 's' ? ' sis' : '') }, cb, h('span', { class: 'ic' }, icone(o.ic)), h('span', { class: 'tx', text: o.tipo === 's' ? o.nome + ' (sistema)' : (o.longo || o.nome) })));
    });
    const salvar = h('button', { class: 'btn', type: 'button', text: 'Salvar' }), padrao = h('button', { class: 'btn secondary', type: 'button', text: 'Voltar ao padrão' });
    corpo.append(h('div', { class: 'modal-actions' }, padrao, salvar));
    const m = abrirModal('⭐ Atalhos da barra', corpo);
    salvar.onclick = () => { if (!marcados.length) { toast('Escolha pelo menos um atalho (ou volte ao padrão).', true); return; } const ordem = ops.map(o => o.k).filter(k => marcados.indexOf(k) >= 0); try { localStorage.setItem(this.chaveAtalhos(), JSON.stringify(ordem)); } catch (e) {} m.fechar(); this.montarNavegacao(); toast('Barra de baixo atualizada.'); };
    padrao.onclick = () => { try { localStorage.removeItem(this.chaveAtalhos()); } catch (e) {} m.fechar(); this.montarNavegacao(); toast('Barra de baixo voltou ao padrão.'); };
    atualizar();
  },
  abrirSistema(id) {
    const abas = this.abasDoPerfil().filter(a => a.sis === id); if (!abas.length) return;
    const ult = this.ultimaAba && this.ultimaAba[id]; this.abrirAba(abas.find(a => a.id === ult) ? ult : abas[0].id);
  },

  abrirAba(id) {
    const a = ABAS.find(x => x.id === id); if (!a) return;
    if (a.acao) { a.acao(); return; }
    this.aba = id; (this.ultimaAba = this.ultimaAba || {})[a.sis] = id;
    this.montarNavegacao();
    const sis = SISTEMAS.find(x => x.id === a.sis);
    $('#tituloTopo').textContent = a.gf ? ((sis && sis.titulo) || a.nome) : a.nome;
    Pontos.chip(); $('.hub-top').classList.remove('vazio');
    $('#tituloTopo').hidden = !$('#subTabs').hidden;     // com abas visíveis o título só repetiria o nome da aba
    document.body.dataset.sis = (a.sis === 'ponto' || a.sis === 'fleet' || a.sis === 'financeiro') ? a.sis : '';
    const hubC = limpar($('#hubConteudo')), gfR = $('#gfRoot');
    $('#btnImprimir').hidden = !(a.gf && OFICINA_P.indexOf(this.sessao.perfil) >= 0);
    $('#btnAtualizar').hidden = false;
    const dash = $('#tab-dashboard'); if (dash) dash.classList.toggle('dash-mec', this.sessao.perfil === 'mecanico');
    if (a.esc) {
      PontoHub.esconder(); FinHub.esconder(); hubC.hidden = true; gfR.hidden = true; $('#btnAtualizar').hidden = true; if ($('#tituloTopo').hidden) $('.hub-top').classList.add('vazio'); EscHub.abrir(a.esc);
    } else if (a.fin) {
      EscHub.esconder(); PontoHub.esconder(); hubC.hidden = true; gfR.hidden = true; $('#btnAtualizar').hidden = true; if ($('#tituloTopo').hidden) $('.hub-top').classList.add('vazio'); FinHub.abrir(a.fin);
    } else if (a.ponto) {
      EscHub.esconder(); FinHub.esconder(); hubC.hidden = true; gfR.hidden = true; $('#btnAtualizar').hidden = true; if ($('#tituloTopo').hidden) $('.hub-top').classList.add('vazio'); PontoHub.abrir(a.ponto);
    } else if (a.gf) {
      EscHub.esconder(); PontoHub.esconder(); FinHub.esconder(); hubC.hidden = true; gfR.hidden = false;
      $$('#gfRoot > .tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + a.gf));
      gfAba = a.gf; renderTelaAtual();
    } else {
      EscHub.esconder(); PontoHub.esconder(); FinHub.esconder(); gfR.hidden = true; hubC.hidden = false;
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
    const abas = this.abasDoPerfil();                                     // sistema sem nenhuma tela para esta pessoa não aparece (ex.: Escalas para o motorista, que vê a escala dentro do Fleet)
    this.sistemasDoPerfil().filter(x => x.futuro || abas.some(a => a.sis === x.id)).forEach(x => caixa.append(item(x.ic, x.nome, x.futuro ? null : () => this.abrirSistema(x.id), x.futuro ? h('small', { text: 'em breve' }) : null)));
    caixa.append(h('div', { class: 'side-sec', text: 'Minha conta' }), item('✏️', 'Editar perfil', () => Perfil.abrir()), item('⭐', 'Atalhos da barra de baixo', () => this.configAtalhos()));
    if (S.perfil === 'master') {
      const np = (this.dados && this.dados.pendenciasPlaca) || 0;
      caixa.append(item('👥', 'Usuários', () => Usuarios.abrir(), Usuarios.pendentes ? h('span', { class: 'badge red', text: String(Usuarios.pendentes) }) : null), item('🧾', 'Pendências de placa', () => Pendencias.abrir(), np ? h('span', { class: 'badge red', text: String(np) }) : null));
    }
    caixa.append(item('❓', 'Ajuda', () => Ajuda.abrir()));
    if (S.perfil === 'master') { const np2 = ((this.dados && this.dados.problemas) || []).length; caixa.append(item('🐞', 'Problemas relatados', () => Ajuda.problemas(), np2 ? h('span', { class: 'badge red', text: String(np2) }) : null)); }
    caixa.append(item('🚪', 'Sair do sistema', () => this.sair()));
  },

  async sair() { try { await API.chamar('logout', {}, { semExpirar: true }); } catch (e) {} this.limparSessao(); },
  limparSessao() {
    API.guardar(''); Online.parar(); this.sessao = null; this.dados = null; this.hist = null; this.aba = 'inicio'; this.ultimaAba = {}; veiculoSel = null; PontoHub.reiniciar(); FinHub.reiniciar(); EscHub.reiniciar();
    $$('.overlay.show').forEach(o => { if (!o.id) o.remove(); else o.classList.remove('show'); });
    const p = $('#perfilPop'); if (p) p.remove();
    $('#app').hidden = true; $('#auth').hidden = false; corBarra('#140405'); Auth.mostrar('entrar');
  },
  async retomar() {
    // Sem sessão: a abertura roda enquanto o servidor acorda, e sai mostrando o login.
    if (!API.token()) { Auth.mostrar('entrar'); await Splash.minimo(); Splash.sair(); return; }
    // Com sessão salva: os dados já vêm durante a animação.
    $('#auth').hidden = true; Splash.carregando();
    try { await Promise.all([this.iniciar({}), Splash.minimo()]); }
    catch (e) { $('#app').hidden = true; $('#auth').hidden = false; Auth.mostrar('entrar'); }
    Splash.sair();
  },

  /* ---------- histórico em partes ---------- */
  hist: null,          // { inicio: data mais antiga já completa, completo, lotes: registros antigos já buscados, carregando }
  isoMenos(dias) { const b = new Date(((this.dados && this.dados.hoje) || new Date().toISOString().slice(0, 10)) + 'T12:00:00'); b.setDate(b.getDate() - dias); return b.toISOString().slice(0, 10); },
  /** Junta o que já foi buscado do histórico aos dados novos (o recarregar traz só os 6 meses). */
  juntarHistorico() {
    const d = this.dados; if (!d || !d.historico) return;
    if (!this.hist) { this.hist = { inicio: d.historico.desde, completo: false, lotes: { manutencoes: [], abastecimentos: [], alertas: [] } }; return; }
    Object.keys(this.hist.lotes).forEach(k => { if (!d[k]) return; const ids = new Set(d[k].map(x => x.id)); this.hist.lotes[k].forEach(x => { if (!ids.has(x.id)) d[k].push(x); }); });
  },
  /** Busca o histórico a partir de "de" ('' = tudo). Devolve true se buscou algo novo. */
  precisaHistorico(de) { const h = this.hist; return !!(h && !h.completo && (!de || de < h.inicio)); },
  async pedirHistorico(de, avisar) {
    const h = this.hist; if (!this.precisaHistorico(de) || h.carregando) return false;
    h.carregando = true; if (avisar) toast('Buscando o histórico mais antigo…');
    try {
      const r = await API.chamar('getHistorico', { de: de || '', ate: h.inicio }, avisar ? {} : { fundo: true });
      ['manutencoes', 'abastecimentos', 'alertas'].forEach(k => { h.lotes[k] = h.lotes[k].concat(r[k] || []); });
      h.inicio = de || '0000-00-00'; if (!de) h.completo = true;
      this.juntarHistorico(); Hub.aposDados();
      if (this.aba && (ABAS.find(a => a.id === this.aba) || {}).gf) renderTelaAtual();
      return true;
    } catch (e) { if (avisar) toast(e.message, true); return false; }
    finally { h.carregando = false; }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  API.aoExpirar = () => { if (App.sessao) { toast('Sua sessão expirou. Entre novamente.', true); App.limparSessao(); } };
  document.addEventListener('click', e => { const p = $('#perfilPop'); if (p && !p.contains(e.target)) p.remove(); const o = $('#ocultarPop'); if (o && !o.contains(e.target)) o.remove(); });
  (function () {
    const btn = $('#sideToggle'); if (!btn) return;
    const aplicar = min => { document.body.classList.toggle('side-min', min); btn.textContent = min ? '»' : '«'; btn.title = min ? 'Expandir menu' : 'Recolher menu'; btn.setAttribute('aria-label', btn.title); };
    let min = false; try { min = localStorage.getItem('trm.sidemin') === '1'; } catch (e) {}
    aplicar(min);
    btn.addEventListener('click', () => { min = !document.body.classList.contains('side-min'); aplicar(min); try { localStorage.setItem('trm.sidemin', min ? '1' : '0'); } catch (e) {} setTimeout(() => window.dispatchEvent(new Event('resize')), 220); });
  })();
  API.aquecer();
  let _ultVis = Date.now();
  document.addEventListener('visibilitychange', () => { if (document.hidden) { _ultVis = Date.now(); return; } if (App.sessao && !$('.overlay.show') && Date.now() - _ultVis > 60000) App.recarregar(true); });
  $$('.logo-img').forEach(lg => { const sem = () => { lg.style.display = 'none'; const t = $('.logo-txt', lg.parentNode); if (t) t.hidden = false; }; lg.addEventListener('error', sem); if (lg.complete && lg.naturalWidth === 0) sem(); });
  if (typeof ESCALA_DESGASTE !== 'undefined' && $('#pneusEscala')) $('#pneusEscala').style.background = 'linear-gradient(90deg, ' + ESCALA_DESGASTE.map(e => rgbCss(e[1]) + ' ' + Math.round(e[0] * 100) + '%').join(', ') + ')';
  App.retomar();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});

/* Dica de rolagem: marca a faixa de abas que ainda tem conteúdo escondido (borda esmaecida) e dá um empurrãozinho na primeira vez. */
(function () {
  let agendado = false, nudged = false, ultH = -1;
  // altura da faixa de abas fixa embaixo (celular): o conteúdo e os iframes descontam
  function abasH() { const a = document.getElementById('subTabs'), v = a && !a.hidden && window.innerWidth <= 820 ? a.offsetHeight : 0;
    if (v !== ultH) { ultH = v; document.documentElement.style.setProperty('--abas-h', v + 'px'); window.dispatchEvent(new Event('resize')); } }
  try { nudged = localStorage.getItem('trm-dica-abas') === '1'; } catch (e) { /* sem armazenamento */ }
  function marca(el) {
    const max = el.scrollWidth - el.clientWidth, x = el.scrollLeft;
    el.classList.toggle('rola-dir', max > 4 && x < max - 4); el.classList.toggle('rola-esq', max > 4 && x > 4);
    if (!nudged && max > 24 && el.offsetParent !== null && window.innerWidth <= 820) {
      nudged = true; try { localStorage.setItem('trm-dica-abas', '1'); } catch (e) { /* ok */ }
      setTimeout(() => { try { el.scrollTo({ left: 56, behavior: 'smooth' }); setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 650); } catch (e) { /* ok */ } }, 500);
    }
  }
  function varre() { agendado = false; document.querySelectorAll('.sub-tabs, .chips').forEach(marca); abasH(); if (typeof Online !== 'undefined' && Online._dados.online) Online.montar(); }
  function pede() { if (!agendado) { agendado = true; requestAnimationFrame(varre); } }
  document.addEventListener('scroll', e => { if (e.target && e.target.classList && (e.target.classList.contains('sub-tabs') || e.target.classList.contains('chips'))) pede(); }, true);
  window.addEventListener('resize', pede);
  new MutationObserver(pede).observe(document.body, { childList: true, subtree: true });
  pede();
})();

/* Quem está online agora: barrinhas no topo (menu lateral no PC, barra de cima no celular). A gestão vê os nomes ao tocar. */
const Online = {
  VERSAO: '4a',
  _avisouVersao: false, _timer: null, _dados: { online: 0 },
  nivel(n) { return n >= 8 ? 4 : n >= 4 ? 3 : n >= 2 ? 2 : n >= 1 ? 1 : 0; },
  /** Garante o indicador onde ele aparece: menu lateral (PC), linha do topo do Painel e barra de ações dos sistemas (celular). */
  montar() {
    if (!App.sessao) return;
    const cria = () => { const b = h('button', { class: 'online-ind', type: 'button' }, h('span', { class: 'on-barras', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i')), h('b', { class: 'on-n' })); b.onclick = () => this.abrirLista(); this.pintar(b); return b; };
    const tog = document.getElementById('sideToggle');
    if (tog && !tog.parentElement.classList.contains('side-linha')) { const l = h('div', { class: 'side-linha' }); tog.before(l); l.append(cria(), tog); }
    ['.rel-prob-linha', '.hub-acoes'].forEach(sel => { const el = document.querySelector(sel); if (el && !el.querySelector('.online-ind')) el.insertBefore(cria(), el.firstChild); });
  },
  pintar(b) {
    const n = this._dados.online || 1, txt = n === 1 ? 'Só você online agora' : n + ' pessoas online agora';
    b.dataset.nivel = this.nivel(n); b.querySelector('.on-n').textContent = n; b.title = txt; b.setAttribute('aria-label', txt);
  },
  atualizar(d) {
    if (!d || !App.sessao) return;
    if (d.online) this._dados = { online: d.online, nomes: d.onlineNomes };
    this.montar();
    document.querySelectorAll('.online-ind').forEach(b => this.pintar(b));
    if (App.sessao.perfil === 'master' && !this._avisouVersao && String(d.versaoApi || '') !== this.VERSAO) {
      this._avisouVersao = true;
      toast('O servidor está numa versão anterior (' + (d.versaoApi || 'antiga') + '). No Apps Script: Implantar → Gerenciar implantações → editar → Nova versão.', true);
    }
    if (!this._timer) this._timer = setInterval(() => this.pingar(), 60000);
  },
  async pingar() {
    if (!App.sessao || document.hidden) return;
    try { const r = await API.chamar('presenca', {}, { fundo: true }); this.atualizar(r); } catch (e) { /* indicador é só informativo */ }
  },
  parar() { if (this._timer) clearInterval(this._timer); this._timer = null; this._dados = { online: 0 }; document.querySelectorAll('.online-ind').forEach(b => b.remove()); },
  abrirLista() {
    const n = this._dados.online || 1, nomes = this._dados.nomes;
    if (!nomes) { toast(n === 1 ? 'Só você está online agora.' : n + ' pessoas estão online agora.'); return; }
    const PERFIL = { master: 'Master', admin: 'Gestão', mecanico: 'Oficina', motorista: 'Motorista' };
    abrirModal(n + (n > 1 ? ' pessoas online' : ' pessoa online'), h('div', { class: 'on-lista' }, nomes.map(p => h('div', { class: 'on-pessoa' }, h('span', { class: 'on-ponto' }), h('b', { text: nomeBonito(p.nome) }), h('small', { text: PERFIL[p.perfil] || '' }))),
      h('small', { class: 'hint', text: 'Conta quem usou o sistema nos últimos 3 minutos.' })));
  }
};
document.addEventListener('visibilitychange', () => { if (!document.hidden && App.sessao) Online.pingar(); });

function corBarra(c) { const sp = document.getElementById('splash'); if (sp && !sp.classList.contains('sai')) return; const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', c); }
/* Abertura do portal: tempo mínimo para a animação terminar; depois sai com zoom (estilo PS2). */
const Splash = {
  t0: (window.performance && performance.now()) || 0,
  el() { return document.getElementById('splash'); },
  minimo() {
    const reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, alvo = reduz ? 500 : 2700;
    const falta = Math.max(0, alvo - (performance.now() - this.t0)); return new Promise(r => setTimeout(r, falta));
  },
  carregando() { const e = this.el(); if (e) e.classList.add('carregando'); },
  sair() {
    const e = this.el(); if (!e || e.classList.contains('sai')) return;
    const alvo = !$('#app').hidden ? $('#app') : $('#auth');                // a tela de baixo "chega" enquanto a câmera entra na logo
    if (alvo) { alvo.classList.add('chegando'); setTimeout(() => alvo.classList.remove('chegando'), 1100); }
    e.classList.add('sai'); setTimeout(() => e.remove(), 800);
    // barra do celular: escura na abertura/login, clara no sistema
    corBarra(alvo && alvo.id === 'app' ? '#f3f4f6' : '#140405');
  }
};
