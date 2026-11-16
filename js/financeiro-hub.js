/* Financeiro dentro do Hub. Primeiro a pessoa escolhe Rota ou Loja; a Rota (fechamento de fretes e ticket médio) roda num iframe da mesma origem (site/financeiro/).
   Sessão e chamadas ao servidor vêm do Hub (window.HubFin). */
const Financeiro = {
  area: null,                 // null = tela de escolha | 'rota' | 'loja'
  resumoCache: null,
  resumo() {
    if (this.resumoCache && Date.now() - this.resumoCache.t < 60000) return Promise.resolve(this.resumoCache.r);
    return API.chamar('financeiroRotaResumo').then(r => { this.resumoCache = { t: Date.now(), r }; return r; });
  },
  /** Tela de escolha: a Rota mostra a situação do crédito das escalas; a Loja aparece como "em breve". */
  escolha() {
    const saldo = h('div', { class: 'fo-saldo', text: '…' }), nota = h('div', { class: 'fo-nota', text: 'Saldo em aberto das escalas' }), stats = h('div', { class: 'fo-stats' }), pe = h('div', { class: 'fo-pe' });
    const stat = (rot, v) => h('div', {}, h('small', { text: rot }), h('b', { text: v }));
    this.resumo().then(r => {
      saldo.textContent = fmtMoeda(r.saldo); saldo.classList.toggle('neg', r.saldo < 0);
      nota.textContent = r.saldo < 0 ? 'Gasto acima do crédito das escalas' : 'Crédito das escalas sobrando';
      stats.append(stat('Crédito', fmtMoeda(r.credito)), stat('Gasto', fmtMoeda(r.gasto)), stat('Ticket médio', fmtMoeda(r.ticket)));
      pe.textContent = r.escalas + (r.escalas === 1 ? ' escala salva' : ' escalas salvas') + ', ' + r.fechados + (r.fechados === 1 ? ' balanço fechado' : ' balanços fechados') + ', ' + r.tarifas + ' regiões com tarifa.';
    }).catch(() => { saldo.textContent = 'Indisponível'; nota.textContent = 'Não consegui ler os números agora. Você ainda pode abrir a Rota.'; });
    const rota = h('section', { class: 'fo-painel fo-rota' }, h('h2', { text: 'Rota' }), h('p', { class: 'fo-sub', text: 'Fretes, depósitos, tarifas por região, ticket médio e balanços da semana.' }),
      h('div', { class: 'fo-num' }, saldo, nota), stats, pe, h('button', { class: 'fo-abrir', type: 'button', text: 'Abrir Rota', onclick: () => this.entrar('rota') }));
    const loja = h('section', { class: 'fo-painel fo-loja', 'aria-disabled': 'true' }, h('div', { class: 'fo-toldo' }), h('h2', { text: 'Loja' }), h('p', { class: 'fo-sub', text: 'O financeiro da loja chega depois do da Rota. Quando estiver pronto, ele abre aqui.' }), h('span', { class: 'fo-breve', text: 'Em breve' }));
    return h('div', { class: 'fo' }, h('div', { class: 'fo-grade' }, rota, loja));
  },
  entrar(area) { this.area = area; App.abrirAba(area === 'rota' ? 'fin-rota-lanc' : 'fin-loja'); },
  voltar() { this.area = null; App.abrirAba('fin-escolha'); }
};
const FinHub = {
  frame: null, pronto: false, pendente: null, aba: null,
  abrir(aba) {
    const raiz = $('#finRoot'); raiz.hidden = false;
    if (!this.frame) {
      this.pronto = false;
      this.frame = h('iframe', { src: 'financeiro/rota.html', title: 'Financeiro Rota', class: 'fin-frame', loading: 'eager' });
      raiz.append(this.frame);
      window.addEventListener('resize', this._aj = () => this.ajustar());
    }
    this.aba = aba; this.ajustar();
    if (this.pronto) this.enviar(aba); else this.pendente = aba;
  },
  esconder() { const r = $('#finRoot'); if (r) r.hidden = true; },
  enviar(aba) { try { this.frame.contentWindow.postMessage({ tipo: 'fin-aba', aba }, location.origin); } catch (e) {} },
  ajustar() {
    if (!this.frame || $('#finRoot').hidden) return;
    const barra = $('#bottombar'), alturaBarra = barra && getComputedStyle(barra).display !== 'none' ? barra.offsetHeight : 0;
    const topo = this.frame.getBoundingClientRect().top + window.scrollY;
    this.frame.style.height = Math.max(360, window.innerHeight - topo - alturaBarra - 8) + 'px';
  },
  /** Sair/trocar de conta: nada do financeiro da pessoa anterior pode ficar na tela. */
  reiniciar() {
    if (this.frame) this.frame.remove();
    if (this._aj) window.removeEventListener('resize', this._aj);
    this.frame = null; this.pronto = false; this.pendente = null; this.aba = null; Financeiro.area = null; Financeiro.resumoCache = null; this.esconder();
  }
};
window.addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || e.data.tipo !== 'fin-pronto' || !FinHub.frame || e.source !== FinHub.frame.contentWindow) return;
  FinHub.pronto = true; const a = FinHub.pendente || FinHub.aba; FinHub.pendente = null; if (a) FinHub.enviar(a);
});
window.HubFin = {
  chamar(acao, dados) { return API.chamar(acao, dados || {}); }
};
