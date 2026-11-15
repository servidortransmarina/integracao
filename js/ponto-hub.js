/* Ponto dentro do Hub: o sistema de Ponto original roda num iframe da mesma origem (site/ponto/).
   Login, sessão e chamadas ao servidor vêm do Hub; os perfis ADM / ENCARREGADO vêm do acesso da pessoa ao Ponto. */
const PontoHub = {
  frame: null, pronto: false, pendente: null, aba: null,
  perfil() { return String((App.sessao && App.sessao.pontoPerfil) || '').toUpperCase(); },
  abrir(aba) {
    const raiz = $('#pontoRoot'); raiz.hidden = false;
    if (!this.frame) {
      this.pronto = false;
      this.frame = h('iframe', { src: 'ponto/index.html', title: 'Gestão de Ponto', class: 'ponto-frame', loading: 'eager' });
      raiz.append(this.frame);
      window.addEventListener('resize', this._aj = () => this.ajustar());
    }
    this.aba = aba; this.ajustar();
    if (this.pronto) this.enviar(aba); else this.pendente = aba;
  },
  esconder() { const r = $('#pontoRoot'); if (r) r.hidden = true; },
  enviar(aba) { try { this.frame.contentWindow.postMessage({ tipo: 'ponto-aba', aba }, location.origin); } catch (e) {} },
  /** O iframe ocupa a tela abaixo do cabeçalho do Hub (e acima da barra inferior no celular); a rolagem fica dentro dele. */
  ajustar() {
    if (!this.frame || $('#pontoRoot').hidden) return;
    const barra = $('#bottombar'), alturaBarra = barra && getComputedStyle(barra).display !== 'none' ? barra.offsetHeight : 0;
    const topo = this.frame.getBoundingClientRect().top + window.scrollY;
    this.frame.style.height = Math.max(360, window.innerHeight - topo - alturaBarra - 8) + 'px';
  },
  /** Sair/trocar de conta: nada do Ponto da pessoa anterior pode ficar na tela. */
  reiniciar() {
    if (this.frame) this.frame.remove();
    if (this._aj) window.removeEventListener('resize', this._aj);
    this.frame = null; this.pronto = false; this.pendente = null; this.aba = null; this.esconder();
  }
};
window.addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || e.data.tipo !== 'ponto-pronto' || !PontoHub.frame || e.source !== PontoHub.frame.contentWindow) return;
  PontoHub.pronto = true;
  const a = PontoHub.pendente || PontoHub.aba; PontoHub.pendente = null; if (a) PontoHub.enviar(a);
});
/** Ponte usada pelo iframe: mesma sessão do Hub, mesma ação "ponto" no servidor. */
window.HubPonto = {
  sessao() { return App.sessao ? { perfil: PontoHub.perfil(), usuario: App.sessao.usuario, nome: nomeBonito(App.sessao.nome) } : null; },
  chamar(acao, extras) { return API.chamar('ponto', Object.assign({}, extras || {}, { acao })); }
};
