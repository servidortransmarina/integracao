/* Financeiro dentro do Hub. Primeiro a pessoa escolhe Rota ou Loja; a Rota (fechamento de fretes e ticket médio) roda num iframe da mesma origem (site/financeiro/).
   Sessão e chamadas ao servidor vêm do Hub (window.HubFin). */
const Financeiro = {
  area: null,                 // null = tela de escolha | 'rota' | 'loja'
  escolha() {
    const op = (area, ic, nome, txt, breve) => h('button', { type: 'button', class: 'fin-op' + (breve ? ' breve' : ''), onclick: () => this.entrar(area) }, h('span', { class: 'ic', text: ic }), h('b', { text: nome }), h('small', { text: txt }));
    return h('div', {}, h('div', { class: 'saudacao' }, h('h2', { text: 'Financeiro' }), h('p', { text: 'Qual financeiro você quer abrir?' })),
      h('div', { class: 'fin-escolha' }, op('rota', '🚚', 'Rota', 'Fretes, depósitos, tarifas por região, ticket médio e balanços semanais.'), op('loja', '🏬', 'Loja', 'Em breve.', true)));
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
    this.frame = null; this.pronto = false; this.pendente = null; this.aba = null; Financeiro.area = null; this.esconder();
  }
};
window.addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || e.data.tipo !== 'fin-pronto' || !FinHub.frame || e.source !== FinHub.frame.contentWindow) return;
  FinHub.pronto = true; const a = FinHub.pendente || FinHub.aba; FinHub.pendente = null; if (a) FinHub.enviar(a);
});
window.HubFin = {
  chamar(acao, dados) { return API.chamar(acao, dados || {}); }
};
