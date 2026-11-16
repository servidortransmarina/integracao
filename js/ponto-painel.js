/* Painel: funcionários com horas para folga (mesma regra do Ponto — CalcularFolgasDefinitivo do Excel). Carrega sob demanda e em segundo plano. */
const PontoPainel = {
  item: null, estado: '',
  _especial: ['JOAO PAULO SAID FRAGA LIMA', 'JONAS HENRIQUE BENFICA DE SOUZA', 'LUIS ARTUR FRAGA VIEIRA'],
  _norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase(); },
  _min(s) {
    const v = String(s == null ? '' : s).trim(), m = v.match(/^([+-]?)(\d{1,5}):(\d{2})$/);
    if (m) return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
    return null;                                    // "SEM DADOS" ou vazio nunca vira zero
  },
  _dias(nome, min) {
    if (min === null || min <= 0) return 0;
    const hArr = Math.floor(min / 60) + (min % 60 >= 30 ? 1 : 0), jor = this._especial.indexOf(this._norm(nome)) >= 0 ? 8.8 : 22 / 3;
    const ex = hArr / jor, in_ = Math.floor(ex); return in_ + ((ex - in_) >= 0.5 - 1e-10 ? 1 : 0);
  },
  /** Chamado ao abrir o Painel; só busca uma vez por sessão (e quando o Ponto é atualizado). */
  garantir() {
    if (!(App.sessao && App.sessao.pontoPerfil) || this.estado) return;
    this.estado = 'carregando';
    API.chamar('ponto', { acao: 'getSaldoHoras' }).then(r => {
      const lista = (r.dados || []).map(f => {
        const ms = [f.saldoMesAtual, f.saldoMesAnterior, f.saldoMes2Anterior].map(x => this._min(x));
        const total = ms.every(m => m !== null) ? ms.reduce((a, b) => a + b, 0) : null;
        return { nome: f.nome, dias: this._dias(f.nome, total), total };
      }).filter(x => x.dias > 0).sort((a, b) => b.dias - a.dias || b.total - a.total);
      this.item = lista.length ? {
        nivel: 'warn', sis: 'ponto', ic: '⏱️', origem: 'Ponto', ordem: 6, k: 'pt:folgas', acompanhar: false,
        t: lista.length + (lista.length > 1 ? ' funcionários com horas para folga' : ' funcionário com horas para folga'),
        p: lista.slice(0, 4).map(x => nomeBonito(x.nome).split(' ').slice(0, 2).join(' ') + ' (' + x.dias + (x.dias > 1 ? ' dias' : ' dia') + ')').join(', ') + (lista.length > 4 ? ' e mais ' + (lista.length - 4) + '.' : '.'),
        acao: () => App.abrirAba('ponto-folgas')
      } : null;
      this.estado = 'ok'; if (App.aba === 'inicio') App.abrirAba('inicio');
    }).catch(() => { this.estado = 'ok'; });
  },
  reiniciar() { this.item = null; this.estado = ''; }
};
