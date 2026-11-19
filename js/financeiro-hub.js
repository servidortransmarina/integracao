/* Financeiro dentro do Hub. Primeiro a pessoa escolhe Rota ou Loja; a Rota (fechamento de fretes e ticket médio) roda num iframe da mesma origem (site/financeiro/).
   Sessão e chamadas ao servidor vêm do Hub (window.HubFin). */
const Financeiro = {
  area: null,                 // null = tela de escolha | 'rota' | 'loja'
  resumoCache: null,
  resumoLojaCache: null,
  resumoLoja() {
    if (this.resumoLojaCache && Date.now() - this.resumoLojaCache.t < 60000) return Promise.resolve(this.resumoLojaCache.r);
    return API.chamar('financeiroLojaResumo', {}, { mudo: true }).then(r => { this.resumoLojaCache = { t: Date.now(), r }; return r; });
  },
  resumo() {
    if (this.resumoCache && Date.now() - this.resumoCache.t < 60000) return Promise.resolve(this.resumoCache.r);
    return API.chamar('financeiroRotaResumo').then(r => { this.resumoCache = { t: Date.now(), r }; return r; });
  },
  /** Tela de escolha: a Rota mostra o crédito das escalas; a Loja, o faturamento do mês. */
  escolha() {
    const saldo = h('div', { class: 'fo-saldo', text: '…' }), nota = h('div', { class: 'fo-nota', text: 'Saldo disponível' }), stats = h('div', { class: 'fo-stats' }), pe = h('div', { class: 'fo-pe' });
    const stat = (rot, v) => h('div', {}, h('small', { text: rot }), h('b', { text: v }));
    this.resumo().then(r => {
      saldo.textContent = fmtMoeda(r.saldo); saldo.classList.toggle('neg', r.saldo < 0);
      nota.textContent = r.saldo < 0 ? 'Faturas acima do que foi depositado' : 'Saldo disponível (depositado − faturas)';
      stats.append(stat('Depositado', fmtMoeda(r.depositado)), stat('Faturas lançadas', fmtMoeda(r.faturas)), stat('Saldo das escalas', fmtMoeda(r.saldoEscalas)));
      pe.textContent = r.planilhas + (r.planilhas === 1 ? ' planilha lançada' : ' planilhas lançadas') + ', ' + r.escalas + (r.escalas === 1 ? ' escala salva' : ' escalas salvas') + ', ' + r.tarifas + ' regiões com tarifa.' + (r.ticket ? ' Ticket médio ' + fmtMoeda(r.ticket) + '.' : '');
    }).catch(() => { saldo.textContent = 'Indisponível'; nota.textContent = 'Não consegui ler os números agora. Você ainda pode abrir a Rota.'; });
    const rota = h('section', { class: 'fo-painel fo-rota' }, h('h2', { text: 'Rota' }), h('p', { class: 'fo-sub', text: 'Fretes, depósitos, tarifas por região, ticket médio e balanços da semana.' }),
      h('div', { class: 'fo-num' }, saldo, nota), stats, pe, h('button', { class: 'fo-abrir', type: 'button', text: 'Abrir Rota', onclick: () => this.entrar('rota') }));
    const lv = h('div', { class: 'fo-saldo', text: '…' }), ln = h('div', { class: 'fo-nota', text: 'Faturado no mês' }), ls = h('div', { class: 'fo-stats' }), lp = h('div', { class: 'fo-pe' });
    this.resumoLoja().then(r => {
      lv.textContent = fmtMoeda(r.valorMes); ln.textContent = 'Faturado em ' + new Date().toLocaleDateString('pt-BR', { month: 'long' });
      ls.append(stat('Viagens no mês', String(r.viagensMes)), stat('Depósitos no mês', fmtMoeda(r.depositosMes)));
      const d = x => x ? x.split('-').reverse().join('/') : '—';
      lp.textContent = 'Última viagem ' + d(r.ultimaViagem) + ' · último depósito ' + d(r.ultimoDeposito) + '.';
    }).catch(() => { lv.textContent = 'Indisponível'; ln.textContent = 'Não consegui ler os números agora. Você ainda pode abrir a Loja.'; });
    const loja = h('section', { class: 'fo-painel fo-loja' }, h('h2', { text: 'Loja' }), h('p', { class: 'fo-sub', text: 'Faturamento de frete da Casas Bahia: viagens, depósitos, saldo e relatório da semana.' }),
      h('div', { class: 'fo-num' }, lv, ln), ls, lp, h('button', { class: 'fo-abrir', type: 'button', text: 'Abrir Loja', onclick: () => this.entrar('loja') }));
    return h('div', { class: 'fo' }, h('div', { class: 'fo-grade' }, rota, loja));
  },
  entrar(area) { this.area = area; App.abrirAba(area === 'rota' ? 'fin-rota-lanc' : 'fin-loja-op'); },
  voltar() { this.area = null; App.abrirAba('fin-escolha'); }
};
const FinHub = {
  // um iframe por área (Rota e Loja), criados só quando abertos
  AREAS: { rota: { src: 'financeiro/rota.html', titulo: 'Financeiro Rota' }, loja: { src: 'financeiro/loja.html', titulo: 'Financeiro Loja' } },
  frames: {}, pronto: {}, pendente: {}, aba: null, area: null,
  get frame() { return this.area ? this.frames[this.area] : null; },
  abrir(alvo) {
    const raiz = $('#finRoot'); raiz.hidden = false;
    const [area, aba] = String(alvo).indexOf(':') > 0 ? String(alvo).split(':') : ['rota', alvo];
    this.area = area; this.aba = aba;
    Object.keys(this.frames).forEach(k => { this.frames[k].hidden = k !== area; });
    if (!this.frames[area]) {
      this.pronto[area] = false;
      const f = h('iframe', { src: this.AREAS[area].src, title: this.AREAS[area].titulo, class: 'fin-frame', loading: 'eager' });
      this.frames[area] = f; raiz.append(f);
      if (!this._aj) window.addEventListener('resize', this._aj = () => this.ajustar());
    }
    this.ajustar();
    if (this.pronto[area]) this.enviar(area, aba); else this.pendente[area] = aba;
  },
  esconder() { const r = $('#finRoot'); if (r) r.hidden = true; },
  enviar(area, aba) { try { this.frames[area].contentWindow.postMessage({ tipo: 'fin-aba', aba }, location.origin); } catch (e) {} },
  ajustar() {
    const f = this.frame; if (!f || $('#finRoot').hidden) return;
    const alturaBarra = alturaRodape();
    const topo = f.getBoundingClientRect().top + window.scrollY;
    f.style.height = Math.max(360, window.innerHeight - topo - alturaBarra - 8) + 'px';
  },
  /** Sair/trocar de conta: nada do financeiro da pessoa anterior pode ficar na tela. */
  reiniciar() {
    Object.keys(this.frames).forEach(k => this.frames[k].remove());
    if (this._aj) window.removeEventListener('resize', this._aj);
    this._aj = null; this.frames = {}; this.pronto = {}; this.pendente = {}; this.aba = null; this.area = null;
    Financeiro.area = null; Financeiro.resumoCache = null; Financeiro.resumoLojaCache = null; this.esconder();
  }
};
window.addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || e.data.tipo !== 'fin-pronto') return;
  const area = Object.keys(FinHub.frames).find(k => FinHub.frames[k].contentWindow === e.source); if (!area) return;
  FinHub.pronto[area] = true; const a = FinHub.pendente[area] || (FinHub.area === area ? FinHub.aba : null); FinHub.pendente[area] = null; if (a) FinHub.enviar(area, a);
});
window.HubFin = {
  // a conferência automática de versão (a cada 45 s) e qualquer chamada com o Financeiro fora da tela vão para o segundo plano
  chamar(acao, dados, opc) { const r = $('#finRoot'); return API.chamar(acao, dados || {}, opc || ((acao === 'financeiroRotaVersoes' || !r || r.hidden) ? { fundo: true } : undefined)); }
};
