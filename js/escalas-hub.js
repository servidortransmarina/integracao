/* Escalas dentro do Hub. A tela (planejamento diário das cargas, cadastros, financeiro por carga e histórico) roda num iframe da mesma origem (site/escalas/).
   Sessão e chamadas ao servidor vêm do Hub (window.HubEsc); as abas do Hub trocam a seção que aparece dentro do iframe. */
const EscHub = {
  frame: null, pronto: false, pendente: null, aba: null,
  abrir(aba) {
    const raiz = $('#escRoot'); raiz.hidden = false;
    if (!this.frame) {
      this.pronto = false;
      this.frame = h('iframe', { src: 'escalas/index.html', title: 'Escalas', class: 'fin-frame esc-frame', loading: 'eager' });
      raiz.append(this.frame);
      window.addEventListener('resize', this._aj = () => this.ajustar());
    }
    this.aba = aba; this.ajustar();
    if (this.pronto) this.enviar(aba); else this.pendente = aba;
  },
  esconder() { const r = $('#escRoot'); if (r) r.hidden = true; },
  enviar(aba) { try { this.frame.contentWindow.postMessage({ tipo: 'esc-aba', aba }, location.origin); } catch (e) {} },
  ajustar() {
    if (!this.frame || $('#escRoot').hidden) return;
    const barra = $('#bottombar'), alturaBarra = barra && getComputedStyle(barra).display !== 'none' ? barra.offsetHeight : 0;
    const topo = this.frame.getBoundingClientRect().top + window.scrollY;
    this.frame.style.height = Math.max(360, window.innerHeight - topo - alturaBarra - 8) + 'px';
  },
  /** Sair/trocar de conta: nada da escala da pessoa anterior pode ficar na tela. */
  reiniciar() {
    if (this.frame) this.frame.remove();
    if (this._aj) window.removeEventListener('resize', this._aj);
    this.frame = null; this.pronto = false; this.pendente = null; this.aba = null; this.financeiro = false; this.esconder();
  },
  financeiro: false
};
window.addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || e.data.tipo !== 'esc-pronto' || !EscHub.frame || e.source !== EscHub.frame.contentWindow) return;
  EscHub.pronto = true; EscHub.financeiro = !!e.data.financeiro; const a = EscHub.pendente || EscHub.aba; EscHub.pendente = null; if (a) EscHub.enviar(a);
});
window.HubEsc = {
  chamar(acao, dados) { return API.chamar(acao, dados || {}); }
};
