/* Comunicação com o Apps Script. O token vai no corpo (Apps Script não lê cabeçalhos).
   Content-Type text/plain evita o "preflight" do navegador, que o Apps Script não responde. */
const API = {
  chave: 'trm.sessao.v1',
  token() { try { return localStorage.getItem(this.chave) || ''; } catch (e) { return this._mem || ''; } },
  guardar(t) { this._mem = t; try { t ? localStorage.setItem(this.chave, t) : localStorage.removeItem(this.chave); } catch (e) {} },
  aoExpirar: null,
  _ativas: 0, _frente: 0, _fimFrente: 0, marco: 0, _filaFundo: Promise.resolve(),
  barra(delta) {
    this._ativas = Math.max(0, this._ativas + delta);
    let b = document.getElementById('apiBarra');
    if (!b) { b = document.createElement('div'); b.id = 'apiBarra'; document.body.appendChild(b); }
    b.classList.toggle('on', this._ativas > 0);
  },
  aquecer() { try { fetch(window.TRM_CONFIG.API_URL, { method: 'GET', mode: 'no-cors', cache: 'no-store' }).catch(() => {}); } catch (e) {} },
  /** Espera não haver nada da pessoa em andamento (lançamento, salvar, abrir tela) há pelo menos 0,7 s. */
  ocioso() { return new Promise(ok => { const ver = () => (this._frente === 0 && Date.now() - this._fimFrente > 700) ? ok() : setTimeout(ver, 250); ver(); }); },
  /**
   * opc.mudo: não mostra a barrinha de carregando.
   * opc.fundo: tarefa de segundo plano (histórico, atualização automática, "online"): sem barrinha, uma por vez
   * e só quando a pessoa não está esperando nada — lançamentos e telas abertas por ela sempre passam na frente.
   */
  /* Perfil CHEFE (só visualiza): o servidor já recusa qualquer gravação; aqui a gente nem envia e avisa na hora. Mesma lista do Api.gs. */
  CHEFE_LEITURA: ['ping', 'logout', 'me', 'alterarSenha', 'solicitarTrocaEmail', 'confirmarTrocaEmail', 'atualizarDados', 'getBootstrap', 'getHistorico', 'lerAviso', 'presenca', 'relatarProblema',
    'checklistDetalhe', 'rankingPontos', 'listarUsuarios', 'listarPendenciasPlaca', 'getPrevisao', 'escCarregar', 'escHistorico', 'escDadosCarregar', 'escDadosVersoes', 'escVerificarLimpeza',
    'financeiroRotaCarregar', 'financeiroRotaResumo', 'financeiroRotaVersoes', 'financeiroLojaCarregar', 'financeiroLojaResumo', 'combCarregar', 'combResumo'],
  CHEFE_PONTO: ['getDadosADM', 'getPendentesADM', 'getAcoesCartasADM', 'getAssinaturasResponsaveisADM', 'getDadosEncarregado', 'getSaldoHoras', 'getBancoHorasHistorico', 'getBancoCompleto',
    'getOpcoesExtratoBanco', 'getExtratosBanco', 'estadoCapturaBancoCompleto', 'relatorioBancoHoras', 'getFuncionarios', 'getFolgas', 'estadoSincronizacaoMob', 'getCartoes'],
  soLeitura(action, data) {
    if (typeof App === 'undefined' || !(App.sessao && App.sessao.chefe)) return false;
    return action === 'ponto' ? this.CHEFE_PONTO.indexOf(data && data.acao) < 0 : this.CHEFE_LEITURA.indexOf(action) < 0;
  },
  chamar(action, data, opc) {
    if (this.soLeitura(action, data)) {
      // o que a tela já tinha mudado sozinha (antes de gravar) volta ao que está no servidor
      clearTimeout(this._desfaz); this._desfaz = setTimeout(() => { try { App.recarregar(true); } catch (e) {} }, 400);
      return Promise.reject(new Error('Seu acesso é só de visualização: você pode ver tudo, mas não alterar.'));
    }
    if (opc && opc.fundo) {
      const p = this._filaFundo.then(() => this.ocioso()).then(() => this._enviar(action, data, opc, true));
      this._filaFundo = p.catch(() => {}); return p;
    }
    return this._enviar(action, data, opc, false);
  },
  async _enviar(action, data, opc, fundo) {
    let r;
    const mudo = fundo || (opc && opc.mudo); if (!mudo) this.barra(1);
    if (!fundo) { this._frente++; this.marco++; }
    try {
      const resp = await fetch(window.TRM_CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data: data || {}, token: this.token() }), redirect: 'follow' });
      r = await resp.json();
    } catch (e) { throw new Error('Sem conexão com o servidor. Tente novamente.'); }
    finally { if (!mudo) this.barra(-1); if (!fundo) { this._frente--; this._fimFrente = Date.now(); } }
    if (!r || r.ok === false) {
      let msg = (r && r.error) || 'Erro inesperado.';
      if (msg === 'Ação inválida.') msg = 'Esta função ainda não está no servidor: falta publicar a nova versão do Apps Script (Implantar → Gerenciar implantações → editar → Nova versão).';
      if (/^Sess[ãa]o/.test(msg) && !(opc && opc.semExpirar) && this.aoExpirar) this.aoExpirar();
      const er = new Error(msg); if (r && r.codigo) er.codigo = r.codigo; throw er;
    }
    // o servidor devolveu o que mudou: a tela se atualiza na hora (o recarregamento completo continua em segundo plano)
    if (r.patch && typeof App !== 'undefined' && App.dados && App.aplicarPatch) { try { App.aplicarPatch(r.patch); } catch (e) { console.error(e); } }
    return r;
  }
};
